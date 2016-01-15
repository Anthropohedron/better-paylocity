// ==UserScript==
// @name        Better Paylocity
// @namespace   betterui
// @description Improvements to the Paylocity UI
// @include     https://webtime2.paylocity.com/webtime/Employee/Timesheet
// @include     https://webtime2.paylocity.com/webtime/Employee/Timesheet#
// @version     0.1.0
// @grant       GM_addStyle
// @grant       unsafeWindow
// ==/UserScript==

(function(win, doc) {

// the page can't call functions defined in this context, so export to the
// page
function ef(fn) { return exportFunction(fn, win); }

// exported function to be called by jQuery's each
var eachWorked = ef(function eachWorked() { this.value = 9; });

// make any row with an unset "Pay Type" column default to "Worked"
function defaultWorked() {
  win.$('tr.pay-type-description > td > select > option[value=0][selected]')
    .parent()
    .each(eachWorked);
}

// make custom Add Row button markup to be used later
var addRowBtn = win.$.parseHTML([
    '<div id="myAddRowBtn" class="t-link">',
      '<span class="t-sprite p-tool-add"></span>',
      'Add&nbsp;Row',
    '</div>'
  ].join(''))[0];

// attach handlers to the Add Row button click
win.$(addRowBtn)
  .click(win.addShift)
  .click(ef(defaultWorked));

// set up some CSS
GM_addStyle([
    // just let the page do the scrolling
    'div#TimesheetContainer { max-height: none; }',
    // make the Add Row button look good
    '#myAddRowBtn {',
       'background: #DEF1FA;',
       'margin-top: 10px;',
       'border: 1px solid;',
       'padding: 3px;',
       'border-radius: 8px;',
    '},'
    '#myAddRowBtn .t-sprite {',
       'margin-right: 3px;',
    '}'
  ].join(''));

// default all unset rows to Worked
defaultWorked();

// wrap row selection to place the Add Row button at the associated day
var wrappedOnSelect = win.selectEntryRow;
function wrapOnSelect(row) {
  // call wrapped function
  var result = wrappedOnSelect(row);
  // get the newly-selected row
  var row = win.getSelectedEntryRow();
  if (row) {
    // if it's appropriate, add the Add Row button near the row
    row.parents('.day-end').prev('td.day').append(addRowBtn);
  } else {
    // no appropriate row, so make sure the Add Row button is gone
    win.$(addRowBtn).remove();
  }
  return result;
}
win.selectEntryRow = ef(wrapOnSelect);

})(unsafeWindow, unsafeWindow.document);

