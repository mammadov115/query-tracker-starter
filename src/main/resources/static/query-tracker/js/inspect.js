// inspect.js - inspect page
var Inspect = (function () {

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function countDups(queries) {
    var counts = {};
    queries.forEach(function(q){ counts[q.sql] = (counts[q.sql]||0)+1; });
    return queries.filter(function(q){ return counts[q.sql] > 1; }).length;
  }

  function open(trace) {
    $('#page-list').addClass('hidden');
    $('#page-inspect').removeClass('hidden');

    var queries = trace.queries || [];

    // topbar
    $('#inspect-method').text(trace.method).attr('class', 'method-badge method-' + trace.method);
    $('#inspect-uri').text(trace.uri);

    var flagsHtml = '';
    if (trace.hasNPlusOne)   flagsHtml += '<span class="itag itag-nplus1">N+1 DETECTED</span>';
    if (trace.hasDuplicates) flagsHtml += '<span class="itag itag-dup">DUPLICATES</span>';
    $('#inspect-flags').html(flagsHtml);

    // summary line
    $('#inspect-meta-line').text(
      'trace ' + trace.traceId +
      '   request ' + trace.durationMs + 'ms' +
      '   visible window ' + trace.durationMs + 'ms'
    );

    // stats
    var dbTime  = queries.reduce(function(s,q){ return s+q.durationMs; }, 0);
    var slowCnt = queries.filter(function(q){ return q.durationMs > 50; }).length;
    var dupCnt  = countDups(queries);

    $('#istat-queries').text(queries.length);
    $('#istat-slow').text(slowCnt);
    $('#istat-dup').text(dupCnt);
    $('#istat-db-time').text(dbTime + 'ms');
    $('#istat-total').text(trace.durationMs + 'ms');

    // build dup/n1 map
    var sqlCounts = {};
    queries.forEach(function(q){ sqlCounts[q.sql] = (sqlCounts[q.sql]||0)+1; });

    // query list
    var $list = $('#query-list').empty();
    $('#detail-panel').removeClass('visible').empty();

    queries.forEach(function (q, i) {
      var isDup  = sqlCounts[q.sql] > 1;
      var isSlow = q.durationMs > 50;
      var isN1   = trace.hasNPlusOne && isDup;

      var tags = '';
      if (isSlow) tags += '<span class="qtag qtag-slow">SLOW</span>';
      if (isDup)  tags += '<span class="qtag qtag-dup">DUP</span>';
      if (isN1)   tags += '<span class="qtag qtag-n1">N+1</span>';

      var durColor = q.durationMs < 50 ? 'var(--ok)' : q.durationMs < 200 ? 'var(--warn)' : 'var(--danger)';

      var entry = '<div class="qentry" data-idx="' + i + '">' +
        '<div class="qentry-num">' + String(i+1).padStart(2,'0') + '</div>' +
        '<div style="flex:1">' +
          (tags ? '<div class="qentry-tags">' + tags + '</div>' : '') +
          '<div class="qentry-sql">' + esc(q.sql) + '</div>' +
        '</div>' +
        '<div class="qentry-dur" style="color:' + durColor + '">' + q.durationMs + 'ms</div>' +
      '</div>';

      $list.append(entry);
    });

    // click query -> detail panel
    $list.off('click', '.qentry').on('click', '.qentry', function () {
      var idx   = parseInt($(this).data('idx'));
      var q     = queries[idx];
      var isDup = sqlCounts[q.sql] > 1;

      $('.qentry').removeClass('active');
      $(this).addClass('active');

      var durNs = q.durationMs * 1000000;
      $('#detail-panel').html(
        '<div class="detail-title">QUERY #' + (idx+1) + ' DETAIL' +
          (q.durationMs > 50 ? ' <span class="qtag qtag-slow">SLOW</span>' : '') +
        '</div>' +
        '<div class="detail-sql">' + esc(q.sql) + '</div>' +
        '<div class="detail-meta">' +
          '<div class="dmeta-item"><div class="dmeta-label">EXECUTION</div><div class="dmeta-val">' + q.durationMs + 'ms</div></div>' +
          '<div class="dmeta-item"><div class="dmeta-label">START OFFSET</div><div class="dmeta-val">0.000ms</div></div>' +
          '<div class="dmeta-item"><div class="dmeta-label">DURATION NS</div><div class="dmeta-val">' + durNs + '</div></div>' +
          '<div class="dmeta-item"><div class="dmeta-label">DUPLICATES</div><div class="dmeta-val">' + (isDup ? sqlCounts[q.sql] + 'x' : '1x') + '</div></div>' +
        '</div>'
      ).addClass('visible');
    });
  }

  function close() {
    $('#page-inspect').addClass('hidden');
    $('#page-list').removeClass('hidden');
  }

  return { open: open, close: close };
})();
