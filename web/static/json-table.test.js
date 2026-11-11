const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const utils = require("./utils.js");

function createTableContext(rows) {
  function createElement(tagName) {
    const classes = new Set();
    return {
      tagName,
      children: [],
      listeners: {},
      style: {},
      textContent: "",
      value: "",
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); }
      },
      appendChild(child) { this.children.push(child); },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
      replaceChildren(...children) { this.children = children; },
      addEventListener(event, handler) { this.listeners[event] = handler; },
      setAttribute(name, value) { this[name] = value; },
      select() {},
      setSelectionRange() {},
      scrollIntoView() {}
    };
  }
  const elements = Object.fromEntries([
    "jsonFieldList", "jsonTableContainer", "jsonTableSummary", "jsonTableStatus", "jsonTableCard",
    "jsonCellSelection", "btnJSONOpenCell", "btnJSONBack", "input", "output", "status",
    "btnCopy", "btnSave", "btnJSONTable", "btnJSONTableTranspose", "jsonTableCopyHint"
  ].map(id => [id, Object.assign(createElement("div"), { id })]));
  elements.input.value = JSON.stringify(rows);
  elements.output.value = JSON.stringify(rows, null, 2);
  const storage = new Map();
  const copied = [];
  const context = vm.createContext({
    window: { WrenchUtils: utils },
    sessionStorage: {
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: { clipboard: { async writeText(text) { copied.push(text); } } },
    console: { warn() {}, error() {} },
    document: {
      getElementById(id) { return elements[id] || null; },
      createElement,
      addEventListener() {},
      querySelectorAll(selector) {
        const inputs = elements.jsonFieldList.children.map(label => label.children[0]);
        return selector.endsWith(":checked") ? inputs.filter(input => input.checked) : inputs;
      },
      body: Object.assign(createElement("body"), { dataset: { page: "json" } }),
      execCommand() { return false; }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), context);
  vm.runInContext(`
    jsonTableRows = ${JSON.stringify(rows)};
    renderJSONFieldList(collectJSONTableFields(jsonTableRows));
    renderJSONTable();
  `, context);
  return { context, elements, copied, storage };
}

test("JSON table select all and invert handle mixed and empty selections", () => {
  const { context, elements } = createTableContext([{ name: "Alice", age: 18, active: true }]);
  const inputs = elements.jsonFieldList.children.map(label => label.children[0]);
  inputs[1].checked = false;
  vm.runInContext("selectJSONTableFields(true)", context);
  assert.deepEqual(inputs.map(input => input.checked), [false, true, false]);
  assert.equal(elements.jsonTableSummary.textContent, "1 行 / 1 列");

  vm.runInContext("selectJSONTableFields()", context);
  assert.deepEqual(inputs.map(input => input.checked), [true, true, true]);
  vm.runInContext("selectJSONTableFields(true)", context);
  assert.deepEqual(inputs.map(input => input.checked), [false, false, false]);
  assert.equal(elements.jsonTableSummary.textContent, "1 行 / 0 列");
  assert.match(elements.jsonTableContainer.innerHTML, /请至少选择一个字段/);
  vm.runInContext("selectJSONTableFields()", context);
  assert.equal(elements.jsonTableSummary.textContent, "1 行 / 3 列");
});

test("JSON table column copy preserves row order and cell formatting without a header", async () => {
  const { context, elements, copied } = createTableContext([
    { value: "first", other: "skip" }, { value: 0 }, { value: false },
    { value: null }, {}, { value: { nested: [1, 2] } }, { value: "last\nline" }
  ]);
  const table = elements.jsonTableContainer.children[0];
  const button = table.children[0].children[0].children[0].children[0].children[1];
  assert.equal(button.textContent, "复制列");
  await button.listeners.click();
  assert.deepEqual(copied, ['first\n0\nfalse\n\n\n{"nested":[1,2]}\nlast\nline']);
  assert.equal(elements.jsonTableStatus.textContent, "已复制「value」列（7 行）");
  assert.equal(elements.jsonTableStatus.className, "status ok");

  vm.runInContext("clearJSONTableView()", context);
  assert.equal(elements.jsonTableStatus.textContent, "");
  assert.equal(elements.jsonTableCard.hidden, true);
});

test("JSON table copies a single empty cell to clear previous clipboard content", async () => {
  const { context, copied } = createTableContext([{ value: null }]);
  await vm.runInContext('copyJSONTableColumn("value")', context);
  assert.deepEqual(copied, [""]);
});

test("JSON table reports clipboard failure after fallback fails", async () => {
  const { context, elements } = createTableContext([{ value: "text" }]);
  context.navigator.clipboard.writeText = async () => { throw new Error("Permission denied"); };
  await vm.runInContext('copyJSONTableColumn("value")', context);
  assert.equal(elements.jsonTableStatus.className, "status err");
  assert.match(elements.jsonTableStatus.textContent, /复制失败/);
  assert.equal(context.document.body.children.length, 0);
});

test("JSON table only enables opening objects, arrays and JSON container strings", () => {
  const { context, elements } = createTableContext([{
    object: { ok: true }, array: [1, 2], encoded: '{"nested":true}',
    text: "hello", invalid: "{broken", empty: null, number: 0, boolean: false, scalar: "123"
  }]);
  const cells = elements.jsonTableContainer.children[0].children[1].children[0].children;
  cells.forEach((cell, index) => {
    cell.listeners.click();
    assert.equal(elements.btnJSONOpenCell.disabled, index > 2);
    assert.equal(cell.classList.contains("json-cell-selected"), true);
    if (index > 0) assert.equal(cells[index - 1].classList.contains("json-cell-selected"), false);
    assert.equal(elements.input.value, JSON.stringify([{
      object: { ok: true }, array: [1, 2], encoded: '{"nested":true}',
      text: "hello", invalid: "{broken", empty: null, number: 0, boolean: false, scalar: "123"
    }]));
  });
  vm.runInContext("openSelectedJSONCell()", context);
  assert.equal(vm.runInContext("jsonNavigationHistory.length", context), 0);
});

test("JSON table opening and returning through nested documents restores exact input and field selection", () => {
  const rows = [{ request: { child: '{"ok":true}' }, ignored: "text" }];
  const { context, elements, storage } = createTableContext(rows);
  const originalInput = '2026-11-11 stderr F ' + JSON.stringify(rows);
  const originalOutput = elements.output.value;
  elements.input.value = originalInput;
  elements.jsonFieldList.children[1].children[0].checked = false;
  vm.runInContext("renderJSONTable()", context);
  const cell = elements.jsonTableContainer.children[0].children[1].children[0].children[0];
  cell.listeners.keydown({ key: "Enter", preventDefault() {} });
  vm.runInContext("openSelectedJSONCell()", context);
  const firstInput = elements.input.value;
  const firstOutput = elements.output.value;
  assert.deepEqual(JSON.parse(firstOutput), { child: { ok: true } });
  assert.equal(firstInput, firstOutput);
  assert.equal(elements.jsonTableCard.hidden, true);
  assert.equal(elements.btnJSONBack.disabled, false);
  assert.equal(storage.get("wrench:json:input"), firstInput);

  vm.runInContext("showJSONTableView()", context);
  const nestedCell = elements.jsonTableContainer.children[0].children[1].children[0].children[0];
  nestedCell.listeners.click();
  vm.runInContext("openSelectedJSONCell()", context);
  assert.deepEqual(JSON.parse(elements.output.value), { ok: true });

  vm.runInContext("restorePreviousJSON()", context);
  assert.equal(elements.input.value, firstInput);
  assert.equal(elements.output.value, firstOutput);
  assert.equal(elements.jsonTableCard.hidden, false);
  assert.equal(elements.btnJSONBack.disabled, false);
  vm.runInContext("restorePreviousJSON()", context);
  assert.equal(elements.input.value, originalInput);
  assert.equal(elements.output.value, originalOutput);
  assert.deepEqual(elements.jsonFieldList.children.map(label => label.children[0].checked), [true, false]);
  assert.equal(elements.jsonTableSummary.textContent, "1 行 / 1 列");
  assert.equal(elements.btnJSONBack.disabled, true);
  assert.equal(elements.btnJSONOpenCell.disabled, true);
  assert.equal(storage.get("wrench:json:input"), originalInput);
});

test("JSON table rerender clears the selected cell before fields change", () => {
  const { context, elements } = createTableContext([{ nested: [1], other: "value" }]);
  const cell = elements.jsonTableContainer.children[0].children[1].children[0].children[0];
  cell.listeners.click();
  assert.equal(elements.btnJSONOpenCell.disabled, false);
  vm.runInContext("selectJSONTableFields(true)", context);
  assert.equal(elements.btnJSONOpenCell.disabled, true);
  vm.runInContext("openSelectedJSONCell()", context);
  assert.equal(vm.runInContext("jsonNavigationHistory.length", context), 0);
});

test("JSON table transpose places fields on the left and records across columns, then restores the original layout", () => {
  const { context, elements } = createTableContext([{ name: "Alice", age: 18 }, { name: "Bob", age: 20 }]);
  vm.runInContext("toggleJSONTableTranspose()", context);
  let table = elements.jsonTableContainer.children[0];
  assert.deepEqual(table.children[0].children[0].children.map(cell => cell.textContent), ["字段", "第 1 条", "第 2 条"]);
  const records = table.children[1].children.map(row => [
    row.children[0].children[0].children[0].textContent,
    ...row.children.slice(1).map(cell => cell.children[0].textContent)
  ]);
  assert.deepEqual(records, [["name", "Alice", "Bob"], ["age", "18", "20"]]);
  assert.equal(table.children[1].children[0].children[0].scope, "row");
  assert.equal(elements.btnJSONTableTranspose["aria-pressed"], "true");
  assert.equal(elements.btnJSONTableTranspose.textContent, "恢复行列");
  assert.equal(elements.jsonTableSummary.textContent, "2 个字段 / 2 条记录 · 已转置");

  vm.runInContext("toggleJSONTableTranspose()", context);
  table = elements.jsonTableContainer.children[0];
  assert.equal(table.className, "json-data-table");
  assert.equal(table.children[0].children[0].children[0].scope, "col");
  assert.equal(table.children[1].children[1].children[0].children[0].textContent, "Bob");
  assert.equal(elements.btnJSONTableTranspose["aria-pressed"], "false");
  assert.equal(elements.jsonTableSummary.textContent, "2 行 / 2 列");
});

test("transposed JSON table filters fields and copies all record values including empty cells", async () => {
  const { context, elements, copied } = createTableContext([
    { value: 0, other: "text" }, { value: false }, { value: null }, {}
  ]);
  elements.jsonFieldList.children[1].children[0].checked = false;
  vm.runInContext("toggleJSONTableTranspose()", context);
  const tbody = elements.jsonTableContainer.children[0].children[1];
  assert.equal(tbody.children.length, 1);
  assert.equal(tbody.children[0].children.length, 5);
  const copyButton = tbody.children[0].children[0].children[0].children[1];
  assert.equal(copyButton.textContent, "复制字段");
  await copyButton.listeners.click();
  assert.deepEqual(copied, ["0\nfalse\n\n"]);
  assert.equal(elements.jsonTableStatus.textContent, "已复制「value」字段（4 条记录）");
  vm.runInContext("selectJSONTableFields(true)", context);
  assert.equal(elements.jsonTableContainer.children[0].children[1].children[0].children[0].children[0].children[0].textContent, "other");
  vm.runInContext("selectJSONTableFields()", context);
  assert.equal(elements.jsonTableContainer.children[0].children[1].children.length, 2);
  vm.runInContext("selectJSONTableFields(true)", context);
  assert.match(elements.jsonTableContainer.innerHTML, /请至少选择一个字段/);
  assert.equal(elements.btnJSONTableTranspose["aria-pressed"], "true");
});

test("opening a cell from a transposed JSON table keeps its record identity and restores the previous orientation", () => {
  const { context, elements } = createTableContext([
    { label: "first", nested: { record: 1 } }, { label: "second", nested: { record: 2 } }
  ]);
  const originalInput = elements.input.value;
  elements.jsonFieldList.children[0].children[0].checked = false;
  vm.runInContext("toggleJSONTableTranspose()", context);
  const cell = elements.jsonTableContainer.children[0].children[1].children[0].children[2];
  cell.listeners.click();
  assert.match(elements.jsonCellSelection.textContent, /第 2 条记录「nested」/);
  vm.runInContext("openSelectedJSONCell()", context);
  assert.deepEqual(JSON.parse(elements.output.value), { record: 2 });
  vm.runInContext("showJSONTableView(); toggleJSONTableTranspose(); restorePreviousJSON()", context);
  assert.equal(elements.input.value, originalInput);
  assert.equal(elements.btnJSONTableTranspose["aria-pressed"], "true");
  assert.deepEqual(elements.jsonFieldList.children.map(label => label.children[0].checked), [false, true]);
  assert.equal(elements.jsonTableContainer.children[0].children[1].children[0].children[2].children[0].textContent, '{"record":2}');
});
