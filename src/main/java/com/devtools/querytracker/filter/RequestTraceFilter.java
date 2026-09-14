package com.devtools.querytracker.filter;

import com.devtools.querytracker.analyzer.TraceAnalyzer;
import com.devtools.querytracker.listener.QueryContext;
import com.devtools.querytracker.model.QueryEntry;
import com.devtools.querytracker.model.RequestTrace;
import com.devtools.querytracker.storage.TraceStorage;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
public class RequestTraceFilter extends OncePerRequestFilter {

    private final TraceStorage traceStorage;
    private final TraceAnalyzer traceAnalyzer;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        // skip internal query-tracker endpoints
        String uri = request.getRequestURI();
        if (uri.startsWith("/query-tracker")) {
            chain.doFilter(request, response);
            return;
        }

        QueryContext.clear();
        long start = System.currentTimeMillis();

        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            List<QueryEntry> queries = QueryContext.getAndClear();

            RequestTrace trace = RequestTrace.builder()
                    .traceId(UUID.randomUUID().toString())
                    .method(request.getMethod())
                    .uri(uri)
                    .statusCode(response.getStatus())
                    .durationMs(duration)
                    .timestamp(System.currentTimeMillis())
                    .queryCount(queries.size())
                    .hasNPlusOne(traceAnalyzer.detectNPlusOne(queries))
                    .hasDuplicates(traceAnalyzer.detectDuplicates(queries))
                    .queries(queries)
                    .build();

            traceStorage.save(trace);
        }
    }
}
