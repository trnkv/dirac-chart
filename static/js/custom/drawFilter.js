function drawFilter(selector, value, text) {
    $(selector).append(`\
    <div class="form-check">\
      <input class="form-check-input" type="checkbox" value="${value}" id="${value}" >\
      <label class="form-check-label" for="${value}">\
        ${text}\
      </label>\
    </div>\
    `);
  }