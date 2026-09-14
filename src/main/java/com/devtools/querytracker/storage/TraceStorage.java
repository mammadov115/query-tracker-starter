package com.devtools.querytracker.storage;

import com.devtools.querytracker.model.RequestTrace;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;

@Component
public class TraceStorage {

    private static final int MAX_SIZE = 200;
    private final LinkedList<RequestTrace> traces = new LinkedList<>();

    public synchronized void save(RequestTrace trace) {
        traces.addFirst(trace);
        if (traces.size() > MAX_SIZE) {
            traces.removeLast();
        }
    }

    public synchronized List<RequestTrace> getAll() {
        return Collections.unmodifiableList(new ArrayList<>(traces));
    }

    public synchronized void clear() {
        traces.clear();
    }
}
