package com.devtools.querytracker.config;

import com.devtools.querytracker.analyzer.TraceAnalyzer;
import com.devtools.querytracker.controller.QueryTrackerController;
import com.devtools.querytracker.filter.RequestTraceFilter;
import com.devtools.querytracker.storage.TraceStorage;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration
@ConditionalOnWebApplication
@ComponentScan(basePackages = "com.devtools.querytracker")
public class QueryTrackerAutoConfiguration {

    @Bean
    public FilterRegistrationBean<RequestTraceFilter> requestTraceFilter(
            TraceStorage traceStorage,
            TraceAnalyzer traceAnalyzer) {

        FilterRegistrationBean<RequestTraceFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new RequestTraceFilter(traceStorage, traceAnalyzer));
        bean.addUrlPatterns("/*");
        bean.setOrder(1);
        return bean;
    }
}
