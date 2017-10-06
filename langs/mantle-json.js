/**
 * Nektro / mantle.js
 * A modular programming language lexer and parser, currently written in JavaScript
 *
 * https://github.com/Nektro/mantle.js
 * 
 * mantle-json
 * http://www.json.org/
 */
//

import {mantle} from '../mantle.js';

export const mantle_json = ({
    lexer: new (class extends mantle.lexer.Lexer {
        constructor() {
            super(
                ['true','false','null'],
                ['{','}','[',']',':',',','.'],
                ['"'],
                false,
                false
            );
        }
        isValidVarChar(c) {
            return ((c >= 'a') && (c <= 'z')) || ((c >= '0') && (c <= '9'));
        }
    })(),
    parser: new (class extends mantle.parser.Parser {
        constructor() {
            super();
            const VALUE = ["String","Integer","Decimal","Object","Array","Key_true","Key_false","Key_null"];

            this.addRule(["Integer","Sym_.","Integer"], function(list, i) {
                const a = list[i];
                const b = list[i + 2];
                return new mantle.parser.ExpressionSimple("Decimal", a.line, a.pos, parseFloat(`${a.value}.${b.value}`));
            });

            this.addRule(["String","Sym_:"], function(list, i) { return new mantle.parser.ExpressionSimple("PairKey", list[i].line, list[i].pos, list[i].value); });
            this.addRule(["PairKey",VALUE], function(list, i) { return new mantle.parser.ExpressionContainer("Pair", [list[i],list[i+1]]); });
            this.addRule(["Pair"], function(list, i) { return new mantle.parser.ExpressionContainer("Members", [list[i]]); });
            this.addRule(["Members","Sym_,","Members"], function(list, i) { return new mantle.parser.ExpressionContainer("Members", [...list[i].value,...list[i+2].value]); });
            this.addRule(["Sym_{","Members","Sym_}"], function(list, i) { return new mantle.parser.ExpressionContainer("Object", list[i+1].value); });
            this.addRule(["Sym_[",VALUE], function(list, i) { return new mantle.parser.ExpressionContainer("Elements", [list[i+1]]); });
            this.addRule(["Elements","Sym_,",VALUE], function(list, i) { return new mantle.parser.ExpressionContainer("Elements", [...list[i].value,list[i+2]]); });
            this.addRule(["Elements","Sym_]"], function(list, i) { return new mantle.parser.ExpressionContainer("Array", list[i].value); });
            this.addRule(["Sym_[","Sym_]"], function(list, i) { return new mantle.parser.ExpressionContainer("Array", [], list[i].line, list[i].pos); });
            this.addRule(["Sym_{","Sym_}"], function(list, i) { return new mantle.parser.ExpressionContainer("Object", [], list[i].line, list[i].pos); });
        }
    })(),
    parse: function(src) {
        return this.parser.parse(this.lexer.lex(src));
    }
});
