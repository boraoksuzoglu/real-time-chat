module.exports = new function () {
    var rules = [{
            expression: /&/g,
            replacement: '&amp;'
        },
        {
            expression: /</g,
            replacement: '&lt;'
        },
        {
            expression: />/g,
            replacement: '&gt;'
        },
        {
            expression: /"/g,
            replacement: '&quot;'
        },
        {
            expression: /'/g,
            replacement: '&#039;'
        }
    ];

    this.escape = function (html) {
        var result = html;

        for (var i = 0; i < rules.length; ++i) {
            var rule = rules[i];

            result = result.replace(rule.expression, rule.replacement);
        }

        return result;
    }
};
