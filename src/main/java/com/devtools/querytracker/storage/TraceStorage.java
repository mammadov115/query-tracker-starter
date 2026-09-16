package com.devtools.querytracker.storage;

import com.devtools.querytracker.model.RequestTrace;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Component
public class TraceStorage {

    private static final int MAX_SIZE = 200;
    private static final String FILE_PATH = "query-tracker-traces.json";

    private final LinkedList<RequestTrace> traces = new LinkedList<>();
    private final ObjectMapper mapper = new ObjectMapper();

    @PostConstruct
    public synchronized void load() {
        File file = new File(FILE_PATH);
        if (!file.exists()) return;
        try {
            List<RequestTrace> loaded = mapper.readValue(file, new TypeReference<List<RequestTrace>>() {});
            traces.addAll(loaded);
        } catch (Exception e) {
            // corrupted file - start fresh
            file.delete();
        }
    }

    public synchronized void save(RequestTrace trace) {
        traces.addFirst(trace);
        if (traces.size() > MAX_SIZE) {
            traces.removeLast();
        }
        persist();
    }

    public synchronized List<RequestTrace> getAll() {
        return Collections.unmodifiableList(new ArrayList<>(traces));
    }

    /** Returns one page of traces (zero-based page index). */
    public synchronized List<RequestTrace> getPage(int page, int size) {
        int total = traces.size();
        int from  = Math.min(page * size, total);
        int to    = Math.min(from + size, total);
        return Collections.unmodifiableList(new ArrayList<>(traces).subList(from, to));
    }

    /** Returns aggregate stats across all traces for the summary bar. */
    public synchronized Map<String, Object> getSummary() {
        int total    = traces.size();
        long totalQ  = traces.stream().mapToLong(RequestTrace::getQueryCount).sum();
        long np1     = traces.stream().filter(RequestTrace::isHasNPlusOne).count();
        long dup     = traces.stream().filter(RequestTrace::isHasDuplicates).count();
        long totalMs = traces.stream().mapToLong(RequestTrace::getDurationMs).sum();

        Map<String, Object> s = new LinkedHashMap<>();
        s.put("totalRequests", total);
        s.put("totalQueries", totalQ);
        s.put("nPlusOneCount", np1);
        s.put("duplicateCount", dup);
        s.put("totalDurationMs", totalMs);
        return s;
    }

    public synchronized int count() {
        return traces.size();
    }

    public synchronized void clear() {
        traces.clear();
        new File(FILE_PATH).delete();
    }

    private void persist() {
        try {
            mapper.writeValue(new File(FILE_PATH), new ArrayList<>(traces));
        } catch (Exception e) {
            // log silently - persistence is best-effort
        }
    }
}
