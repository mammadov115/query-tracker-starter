package com.devtools.querytracker.controller;

import com.devtools.querytracker.model.RequestTrace;
import com.devtools.querytracker.storage.TraceStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/query-tracker")
@RequiredArgsConstructor
public class QueryTrackerController {

    private final TraceStorage traceStorage;

    @GetMapping("/api/traces")
    public ResponseEntity<Map<String, Object>> getTraces() {
        List<RequestTrace> traces = traceStorage.getAll();
        return ResponseEntity.ok(Map.of("status", "success", "data", Map.of("traces", traces)));
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
}
