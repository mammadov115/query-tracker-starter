package com.devtools.querytracker.analyzer;

import com.devtools.querytracker.model.QueryEntry;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class TraceAnalyzer {

    // normalize params: replace literal values with ?
    private static final Pattern PARAM_PATTERN =
            Pattern.compile("'[^']*'|\\b\\d+\\b");

    public boolean detectNPlusOne(List<QueryEntry> queries) {
        if (queries.size() < 3) return false;
        Map<String, Integer> patternCount = new HashMap<>();
        for (QueryEntry q : queries) {
            String normalized = normalize(q.getSql());
            patternCount.merge(normalized, 1, Integer::sum);
        }
        // N+1 if same parameterized SELECT appears 3+ times
        return patternCount.entrySet().stream()
                .filter(e -> e.getKey().toUpperCase().startsWith("SELECT"))
                .anyMatch(e -> e.getValue() >= 3);
    }

    public boolean detectDuplicates(List<QueryEntry> queries) {
        if (queries.size() < 2) return false;
        Map<String, Integer> exact = new HashMap<>();
        for (QueryEntry q : queries) {
            exact.merge(q.getSql(), 1, Integer::sum);
        }
        return exact.values().stream().anyMatch(c -> c > 1);
    }

    private String normalize(String sql) {
        return PARAM_PATTERN.matcher(sql).replaceAll("?");
    }
}
