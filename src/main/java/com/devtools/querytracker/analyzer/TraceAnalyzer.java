package com.devtools.querytracker.analyzer;

import com.devtools.querytracker.model.QueryEntry;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class TraceAnalyzer {

    private static final Pattern PARAM_PATTERN =
            Pattern.compile("'[^']*'|\\b\\d+\\b");

    // match: FROM tableName or JOIN tableName or INTO tableName or UPDATE tableName
    private static final Pattern TABLE_PATTERN =
            Pattern.compile("(?:FROM|JOIN|INTO|UPDATE)\\s+([\\w]+)", Pattern.CASE_INSENSITIVE);

    private static final Pattern OP_PATTERN =
            Pattern.compile("^\\s*(SELECT|INSERT|UPDATE|DELETE|MERGE)", Pattern.CASE_INSENSITIVE);

    public boolean detectNPlusOne(List<QueryEntry> queries) {
        if (queries.size() < 3) return false;
        Map<String, Integer> patternCount = new HashMap<>();
        for (QueryEntry q : queries) {
            String normalized = normalize(q.getSql());
            patternCount.merge(normalized, 1, Integer::sum);
        }
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

    // enrich each QueryEntry with tableName, operationType, isDuplicate, duplicateCount
    public List<QueryEntry> enrich(List<QueryEntry> queries) {
        Map<String, Integer> sqlCounts = new HashMap<>();
        for (QueryEntry q : queries) {
            sqlCounts.merge(q.getSql(), 1, Integer::sum);
        }

        List<QueryEntry> enriched = new ArrayList<>();
        for (QueryEntry q : queries) {
            int count = sqlCounts.getOrDefault(q.getSql(), 1);
            enriched.add(QueryEntry.builder()
                    .sql(q.getSql())
                    .durationMs(q.getDurationMs())
                    .executedAt(q.getExecutedAt())
                    .tableName(extractTable(q.getSql()))
                    .operationType(extractOperation(q.getSql()))
                    .isDuplicate(count > 1)
                    .duplicateCount(count)
                    .build());
        }
        return enriched;
    }

    public String extractTable(String sql) {
        if (sql == null) return "unknown";
        Matcher m = TABLE_PATTERN.matcher(sql);
        // return first matched table name
        if (m.find()) return m.group(1).toLowerCase();
        return "unknown";
    }

    public String extractOperation(String sql) {
        if (sql == null) return "UNKNOWN";
        Matcher m = OP_PATTERN.matcher(sql);
        if (m.find()) return m.group(1).toUpperCase();
        return "UNKNOWN";
    }

    private String normalize(String sql) {
        return PARAM_PATTERN.matcher(sql).replaceAll("?");
    }
}
