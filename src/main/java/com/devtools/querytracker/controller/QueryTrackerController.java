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
    public ResponseEntity<Map<String, Object>> getTrace(@PathVariable("traceId") String traceId) {
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

    private Map<String, Object> buildDetail(RequestTrace trace, List<QueryEntry> enriched) {
        long dbTime = enriched.stream().mapToLong(QueryEntry::getDurationMs).sum();
        long slowCount = enriched.stream().filter(q -> q.getDurationMs() > 50).count();
        long dupCount = enriched.stream().filter(QueryEntry::isDuplicate).count();

        // group by table, preserving insertion order
        Map<String, List<QueryEntry>> byTable = new LinkedHashMap<>();
        for (QueryEntry q : enriched) {
            byTable.computeIfAbsent(q.getTableName(), k -> new ArrayList<>()).add(q);
        }

        List<Map<String, Object>> tables = buildTables(byTable);
        List<Map<String, Object>> flowSteps = buildFlowSteps(byTable);
        List<Map<String, Object>> operations = buildOperations(byTable);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("traceId", trace.getTraceId());
        result.put("method", trace.getMethod());
        result.put("uri", trace.getUri());
        result.put("statusCode", trace.getStatusCode());
        result.put("durationMs", trace.getDurationMs());
        result.put("timestamp", trace.getTimestamp());
        result.put("queryCount", enriched.size());
        result.put("dbTimeMs", dbTime);
        result.put("slowCount", slowCount);
        result.put("dupCount", dupCount);
        result.put("hasNPlusOne", trace.isHasNPlusOne());
        result.put("hasDuplicates", trace.isHasDuplicates());
        result.put("tables", tables);
        result.put("flowSteps", flowSteps);
        result.put("operations", operations);
        return result;
    }

    private List<Map<String, Object>> buildTables(Map<String, List<QueryEntry>> byTable) {
        List<Map<String, Object>> tables = new ArrayList<>();
        for (Map.Entry<String, List<QueryEntry>> entry : byTable.entrySet()) {
            List<QueryEntry> qs = entry.getValue();
            long tableDur = qs.stream().mapToLong(QueryEntry::getDurationMs).sum();
            List<String> ops = qs.stream().map(QueryEntry::getOperationType).collect(Collectors.toList());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("table", entry.getKey());
            row.put("operations", ops);
            row.put("count", qs.size());
            row.put("durationMs", tableDur);
            tables.add(row);
        }
        return tables;
    }

    private List<Map<String, Object>> buildFlowSteps(Map<String, List<QueryEntry>> byTable) {
        List<Map<String, Object>> flowSteps = new ArrayList<>();
        int stepNum = 1;
        for (Map.Entry<String, List<QueryEntry>> entry : byTable.entrySet()) {
            List<QueryEntry> qs = entry.getValue();
            long tableDur = qs.stream().mapToLong(QueryEntry::getDurationMs).sum();

            List<Map<String, Object>> subOps = new ArrayList<>();
            int subIdx = 1;
            for (QueryEntry q : qs) {
                Map<String, Object> op = new LinkedHashMap<>();
                op.put("index", stepNum + "." + subIdx);
                op.put("operationType", q.getOperationType());
                op.put("sql", q.getSql());
                op.put("durationMs", q.getDurationMs());
                op.put("isDuplicate", q.isDuplicate());
                op.put("duplicateCount", q.getDuplicateCount());
                subOps.add(op);
                subIdx++;
            }

            Map<String, Object> step = new LinkedHashMap<>();
            step.put("step", stepNum);
            step.put("table", entry.getKey());
            step.put("queryCount", qs.size());
            step.put("durationMs", tableDur);
            step.put("operations", subOps);
            flowSteps.add(step);
            stepNum++;
        }
        return flowSteps;
    }

    private List<Map<String, Object>> buildOperations(Map<String, List<QueryEntry>> byTable) {
        List<Map<String, Object>> operations = new ArrayList<>();
        int globalIdx = 1;
        for (Map.Entry<String, List<QueryEntry>> entry : byTable.entrySet()) {
            List<QueryEntry> qs = entry.getValue();
            int subIdx = 1;
            for (QueryEntry q : qs) {
                Map<String, Object> op = new LinkedHashMap<>();
                op.put("index", globalIdx);
                op.put("label", entry.getKey().toUpperCase() + "." + subIdx);
                op.put("table", entry.getKey());
                op.put("operationType", q.getOperationType());
                op.put("sql", q.getSql());
                op.put("durationMs", q.getDurationMs());
                op.put("isDuplicate", q.isDuplicate());
                op.put("duplicateCount", q.getDuplicateCount());
                operations.add(op);
                subIdx++;
                globalIdx++;
            }
        }
        return operations;
    }
}
