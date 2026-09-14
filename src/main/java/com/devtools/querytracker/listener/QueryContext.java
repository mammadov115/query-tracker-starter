package com.devtools.querytracker.listener;

import com.devtools.querytracker.model.QueryEntry;

import java.util.ArrayList;
import java.util.List;

public class QueryContext {

    private static final ThreadLocal<List<QueryEntry>> QUERIES =
            ThreadLocal.withInitial(ArrayList::new);

    public static void add(QueryEntry entry) {
        QUERIES.get().add(entry);
    }

    public static List<QueryEntry> getAndClear() {
        List<QueryEntry> list = new ArrayList<>(QUERIES.get());
        QUERIES.remove();
        return list;
    }

    public static void clear() {
        QUERIES.remove();
    }
}
