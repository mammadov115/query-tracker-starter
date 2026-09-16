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

    private static final Pattern TABLE_PATTERN =
            Pattern.compile("(?:FROM|JOIN|INTO|UPDATE)\\s+([\\w]+)", Pattern.CASE_INSENSITIVE);

    private static final Pattern OP_PATTERN =
            Pattern.compile("^\\s*(SELECT|INSERT|UPDATE|DELETE|MERGE)", Pattern.CASE_INSENSITIVE);

    private static final Pattern COUNT_PATTERN =
            Pattern.compile("^\\s*SELECT\\s+count\\(", Pattern.CASE_INSENSITIVE);

    private static final Pattern AGGREGATE_PATTERN =
            Pattern.compile("^\\s*SELECT\\s+.*count\\(.*\\).*GROUP\\s+BY", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private static final Pattern IN_CLAUSE_PATTERN =
            Pattern.compile("WHERE\\s+.*\\bIN\\s*\\(", Pattern.CASE_INSENSITIVE);

    private static final Pattern ORDER_BY_PATTERN =
            Pattern.compile("ORDER\\s+BY", Pattern.CASE_INSENSITIVE);

    private static final Pattern JOIN_PATTERN =
            Pattern.compile("\\bJOIN\\b", Pattern.CASE_INSENSITIVE);

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

    public List<QueryEntry> enrich(List<QueryEntry> queries) {
        Map<String, Integer> sqlCounts = new HashMap<>();
        for (QueryEntry q : queries) {
            sqlCounts.merge(q.getSql(), 1, Integer::sum);
        }

        List<QueryEntry> enriched = new ArrayList<>();
        for (QueryEntry q : queries) {
            int count = sqlCounts.getOrDefault(q.getSql(), 1);
            String table = extractTable(q.getSql());
            String operation = extractOperation(q.getSql());
            enriched.add(QueryEntry.builder()
                    .sql(q.getSql())
                    .durationMs(q.getDurationMs())
                    .executedAt(q.getExecutedAt())
                    .tableName(table)
                    .operationType(operation)
                    .label(extractLabel(q.getSql(), table, operation))
                    .isDuplicate(count > 1)
                    .duplicateCount(count)
                    .build());
        }
        return enriched;
    }

    public String extractLabel(String sql, String table, String operation) {
        if (sql == null) return "Unknown operation";
        String upper = sql.trim().toUpperCase();
        String t = capitalize(table);

        switch (operation) {
            case "INSERT": return "Create " + t;
            case "UPDATE": return "Update " + t;
            case "DELETE": return "Delete " + t;
            case "SELECT": return buildSelectLabel(sql, t);
            default:       return operation + " " + t;
        }
    }

    private String buildSelectLabel(String sql, String table) {
        // COUNT(*) or COUNT(id) with no GROUP BY -> total count
        if (COUNT_PATTERN.matcher(sql).find() && !AGGREGATE_PATTERN.matcher(sql).find()) {
            return "Count " + table;
        }
        // SELECT with count(...) GROUP BY -> aggregate (likes, bookmarks, etc.)
        if (AGGREGATE_PATTERN.matcher(sql).find()) {
            // find the joined table to describe what is aggregated
            String joined = findSecondTable(sql);
            if (joined != null) return "Aggregate " + joined + " per " + table;
            return "Aggregate " + table;
        }
        // SELECT ... WHERE id IN (...) -> batch load by IDs
        if (IN_CLAUSE_PATTERN.matcher(sql).find()) {
            return "Batch load " + table;
        }
        // SELECT with JOIN and ORDER BY -> main list/feed query
        if (JOIN_PATTERN.matcher(sql).find() && ORDER_BY_PATTERN.matcher(sql).find()) {
            return "Load " + table + " list";
        }
        // SELECT with JOIN only -> load with relation
        if (JOIN_PATTERN.matcher(sql).find()) {
            return "Load " + table + " with relations";
        }
        // SELECT with ORDER BY -> ordered list
        if (ORDER_BY_PATTERN.matcher(sql).find()) {
            return "Load " + table + " ordered";
        }
        return "Load " + table;
    }

    // returns second table name found after first FROM (i.e. a JOIN-ed table)
    private String findSecondTable(String sql) {
        Matcher m = TABLE_PATTERN.matcher(sql);
        int found = 0;
        while (m.find()) {
            found++;
            if (found == 2) return capitalize(m.group(1).toLowerCase());
        }
        return null;
    }

    public String extractTable(String sql) {
        if (sql == null) return "unknown";
        Matcher m = TABLE_PATTERN.matcher(sql);
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

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
