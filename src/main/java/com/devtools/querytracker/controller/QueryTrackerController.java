package com.devtools.querytracker.controller;

import com.devtools.querytracker.analyzer.TraceAnalyzer;
import com.devtools.querytracker.model.QueryEntry;
import com.devtools.querytracker.model.RequestTrace;
import com.devtools.querytracker.storage.TraceStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/query-tracker")
@RequiredArgsConstructor
public class QueryTrackerController {

    private final TraceStorage traceStorage;
    private final TraceAnalyzer traceAnalyzer;

    @GetMapping("/api/traces")
    public ResponseEntity<Map<String, Object>> getTraces() {
        List<RequestTrace> traces = traceStorage.getAll();
        return ResponseEntity.ok(Map.of("status", "success", "data", Map.of("traces", traces)));
    }

    @GetMapping("/api/traces/{traceId}")
    public ResponseEntity<Map<String, Object>> getTrace(@PathVariable String traceId) {
        return traceStorage.getAll().stream()
                .filter(t -> t.getTraceId().equals(traceId))
                .findFirst()
                .map(trace -> {
                    List<QueryEntry> enriched = traceAnalyzer.enrich(trace.getQueries());
                    Map<String, Object> detail = buildDetail(trace, enriched);
                    return ResponseEntity.ok(Map.of("status", "success", "data", Map.of("trace", detail)));
                })
                .orElse(ResponseEntity.status(404)
                        .body(Map.of("status", "error", "message", "Trace not found")));
    }

    @DeleteMapping("/api/traces")
    public ResponseEntity<Map<String, Object>> clearTraces() {
        traceStorage.clear();
        return ResponseEntity.ok(Map.of("status", "success", "data", Map.of("message", "Traces cleared")));
    }

    @GetMapping
    public ResponseEntity<Void> dashboard() {
        return ResponseEntity.status(302)
                .header("Location", "/query-tracker/index.html")
                .build();
    }

    // build detail payload: tables touched + grouped queries for flow/operations views
    private Map<String, Object> buildDetail(RequestTrace trace, List<QueryEntry> enriched) {
        long dbTime = enriched.stream().mapToLong(QueryEntry::getDurationMs).sum();
        long slowCount = enriched.stream().filter(q -> q.getDurationMs() > 50).count();
        long dupCount = enriched.stream().filter(QueryEntry::isDuplicate).count();

        // group by table
        Map<String, List<QueryEntry>> byTable = new LinkedHashMap<>();
        for (QueryEntry q : enriched) {
            byTable.computeIfAbsent(q.getTableName(), k -> new ArrayList<>()).add(q);
        }

        // tables touched summary
        List<Map<String, Object>> tables = new ArrayList<>();
        for (Map.Entry<String, List<QueryEntry>> entry : byTable.entrySet()) {
            String table = entry.getKey();
            List<QueryEntry> qs = entry.getValue();
            long tableDur = qs.stream().mapToLong(QueryEntry::getDurationMs).sum();
            List<String> ops = qs.stream().map(QueryEntry::getOperationType).collect(Collectors.toList());
            tables.add(Map.of(
                    "table", table,
                    "operations", ops,
                    "count", qs.size(),
                    "durationMs", tableDur
            ));
        }

        // execution flow: steps grouped by table in order of first appearance
        List<Map<String, Object>> flowSteps = new ArrayList<>();
        int stepNum = 1;
        for (Map.Entry<String, List<QueryEntry>> entry : byTable.entrySet()) {
            String table = entry.getKey();
            List<QueryEntry> qs = entry.getValue();
            long tableDur = qs.stream().mapToLong(QueryEntry::getDurationMs).sum();

            List<Map<String, Object>> subOps = new ArrayList<>();
            int subIdx = 1;
            for (QueryEntry q : qs) {
                subOps.add(Map.of(
                        "index", stepNum + "." + subIdx,
                        "operationType", q.getOperationType(),
                        "sql", q.getSql(),
                        "durationMs", q.getDurationMs(),
                        "isDuplicate", q.isDuplicate(),
                        "duplicateCount", q.getDuplicateCount()
                ));
                subIdx++;
            }

            flowSteps.add(Map.of(
                    "step", stepNum,
                    "table", table,
                    "queryCount", qs.size(),
                    "durationMs", tableDur,
                    "operations", subOps
            ));
            stepNum++;
        }

        // flat operations list (all queries in order)
        List<Map<String, Object>> operations = new ArrayList<>();
        int globalIdx = 1;
        for (Map.Entry<String, List<QueryEntry>> entry : byTable.entrySet()) {
            List<QueryEntry> qs = entry.getValue();
            int subIdx = 1;
            for (QueryEntry q : qs) {
                operations.add(Map.of(
                        "index", globalIdx,
                        "label", entry.getKey().toUpperCase() + "." + subIdx,
                        "table", entry.getKey(),
                        "operationType", q.getOperationType(),
                        "sql", q.getSql(),
                        "durationMs", q.getDurationMs(),
                        "isDuplicate", q.isDuplicate(),
                        "duplicateCount", q.getDuplicateCount()
                ));
                subIdx++;
                globalIdx++;
            }
        }

        return Map.of(
                "traceId", trace.getTraceId(),
                "method", trace.getMethod(),
                "uri", trace.getUri(),
                "statusCode", trace.getStatusCode(),
                "durationMs", trace.getDurationMs(),
                "timestamp", trace.getTimestamp(),
                "queryCount", enriched.size(),
                "dbTimeMs", dbTime,
                "slowCount", slowCount,
                "dupCount", dupCount,
                "hasNPlusOne", trace.isHasNPlusOne(),
                "hasDuplicates", trace.isHasDuplicates(),
                "tables", tables,
                "flowSteps", flowSteps,
                "operations", operations
        );
    }
}
