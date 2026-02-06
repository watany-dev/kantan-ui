/**
 * Dataframe クライアントサイドスクリプト
 *
 * ソート、検索フィルタ、行選択のクライアントサイド処理
 */

export const dataframeScript = `
// ======== Dataframe: Sort ========
function sortDataframeColumn(tableId, colIndex) {
  var table = document.querySelector('[data-kt-dataframe="' + tableId + '"]');
  if (!table) return;

  var th = table.querySelector('th[data-kt-dataframe-sort="' + tableId + '"][data-col="' + colIndex + '"]');
  if (!th) return;

  // Determine sort direction
  var currentDir = th.getAttribute("data-sort-dir");
  var newDir = currentDir === "asc" ? "desc" : "asc";

  // Reset all sort indicators in this table
  var allTh = table.querySelectorAll("th[data-kt-dataframe-sort]");
  for (var i = 0; i < allTh.length; i++) {
    allTh[i].removeAttribute("data-sort-dir");
  }
  th.setAttribute("data-sort-dir", newDir);

  // Get data column offset (accounting for select and index columns)
  var headerCells = th.parentElement.children;
  var thIndex = Array.prototype.indexOf.call(headerCells, th);

  var tbody = table.querySelector("tbody");
  if (!tbody) return;
  var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));

  rows.sort(function(a, b) {
    var aCell = a.children[thIndex];
    var bCell = b.children[thIndex];
    if (!aCell || !bCell) return 0;

    var aVal = aCell.textContent.trim();
    var bVal = bCell.textContent.trim();

    // Try numeric comparison
    var aNum = Number(aVal);
    var bNum = Number(bVal);
    if (!isNaN(aNum) && !isNaN(bNum) && aVal !== "" && bVal !== "") {
      return newDir === "asc" ? aNum - bNum : bNum - aNum;
    }

    // String comparison
    var cmp = aVal.localeCompare(bVal);
    return newDir === "asc" ? cmp : -cmp;
  });

  // Reorder DOM
  for (var j = 0; j < rows.length; j++) {
    tbody.appendChild(rows[j]);
  }
}

// ======== Dataframe: Search ========
function filterDataframeRows(tableId, query) {
  var table = document.querySelector('[data-kt-dataframe="' + tableId + '"]');
  if (!table) return;

  var tbody = table.querySelector("tbody");
  if (!tbody) return;
  var rows = tbody.querySelectorAll("tr");
  var lowerQuery = query.toLowerCase();
  var visibleCount = 0;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var text = row.textContent.toLowerCase();
    if (lowerQuery === "" || text.indexOf(lowerQuery) !== -1) {
      row.classList.remove("kt-dataframe-hidden");
      visibleCount++;
    } else {
      row.classList.add("kt-dataframe-hidden");
    }
  }

  // Update row count display
  var container = document.getElementById(tableId + "-container");
  if (container) {
    var countEl = container.querySelector(".kt-dataframe-row-count");
    if (countEl) {
      if (lowerQuery === "") {
        countEl.textContent = rows.length + " rows";
      } else {
        countEl.textContent = visibleCount + " / " + rows.length + " rows";
      }
    }
  }
}

// ======== Dataframe: Selection ========
function updateDataframeSelection(tableId, sendEvent) {
  var checkboxes = document.querySelectorAll('[data-kt-dataframe-row="' + tableId + '"]');
  var selectedRows = [];
  for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked) {
      selectedRows.push(Number(checkboxes[i].value));
    }
  }
  // Update selected row styling
  var table = document.querySelector('[data-kt-dataframe="' + tableId + '"]');
  if (table) {
    var allRows = table.querySelectorAll("tbody tr");
    for (var j = 0; j < allRows.length; j++) {
      var rowIdx = Number(allRows[j].getAttribute("data-row"));
      if (selectedRows.indexOf(rowIdx) !== -1) {
        allRows[j].classList.add("kt-dataframe-selected");
      } else {
        allRows[j].classList.remove("kt-dataframe-selected");
      }
    }
  }
  sendEvent(tableId, { rows: selectedRows });
}

// ======== Dataframe: Select All ========
function toggleDataframeSelectAll(tableId, checked, sendEvent) {
  var checkboxes = document.querySelectorAll('[data-kt-dataframe-row="' + tableId + '"]');
  for (var i = 0; i < checkboxes.length; i++) {
    // Only toggle visible rows
    var row = checkboxes[i].closest("tr");
    if (row && !row.classList.contains("kt-dataframe-hidden")) {
      checkboxes[i].checked = checked;
    }
  }
  updateDataframeSelection(tableId, sendEvent);
}

// ======== Dataframe: Event Delegation ========
function setupDataframeEvents(sendEvent) {
  var app = document.getElementById("app");
  if (!app) return;

  // Sort: header click
  app.addEventListener("click", function(e) {
    var th = e.target.closest("[data-kt-dataframe-sort]");
    if (th) {
      var tableId = th.getAttribute("data-kt-dataframe-sort");
      var colIndex = Number(th.getAttribute("data-col"));
      sortDataframeColumn(tableId, colIndex);
      return;
    }

    // Select all checkbox
    var selectAll = e.target.closest("[data-kt-dataframe-select-all]");
    if (selectAll) {
      var cb = selectAll.querySelector('input[type="checkbox"]');
      if (cb && e.target !== cb) {
        cb.checked = !cb.checked;
      }
      var tid = selectAll.getAttribute("data-kt-dataframe-select-all") ||
                (cb && cb.getAttribute("data-kt-dataframe-select-all"));
      if (tid) {
        toggleDataframeSelectAll(tid, cb.checked, sendEvent);
      }
    }
  });

  // Search: text input
  app.addEventListener("input", function(e) {
    var input = e.target.closest("[data-kt-dataframe-search]");
    if (input) {
      var tableId = input.getAttribute("data-kt-dataframe-search");
      filterDataframeRows(tableId, input.value);
    }
  });

  // Row selection: checkbox/radio change
  app.addEventListener("change", function(e) {
    var cb = e.target.closest("[data-kt-dataframe-row]");
    if (cb) {
      var tableId = cb.getAttribute("data-kt-dataframe-row");
      updateDataframeSelection(tableId, sendEvent);
    }
  });
}
`;
