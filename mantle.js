/**
 * Nektro / mantle.js
 * A modular programming language lexer and parser, currently written in JavaScript
 *
 * https://github.com/Nektro/mantle.js
 */
//

(function() {
    // module exports object
    const mantle = {
        lexer: {},
        parser: {}
    };

    // // // //
    // Lexer //
    // // // //

    // Token type enum
    mantle.lexer.TokenType = (Object.freeze({
        Keyword: 'Keyword', Symbol: 'Symbol', Word: 'Word', String: 'String'
    }));

    // Token class
    mantle.lexer.Token = (class Token {
        constructor(ty, val, l, p) {
            this.type = ty;
            this.value = val;
            this.line = l;
            this.pos = p;
        }
        toString() {
            return String.format("T_%c(%s)", this.type, this.value, this.line, this.pos);
        }
    });

    // Lexing mode enum
    mantle.lexer.LexMode = (Object.freeze({
        Def: 0, String: 1, LCom: 2, MlCom: 3
    }));

    // base Lexer class that langauges inherit
    mantle.lexer.Lexer = (class Lexer {
        constructor(keys, syms, strs, hLC, hMC) {
            this.keywords = keys;
            this.symbols = syms;
            this.stringDelims = strs;
            this.hasLineComments = hLC;
            this.hasMultiComments = hMC;
        }
        // takes a character
        // returns if character is valid ID character
        isValidVarChar(c) {
            return false;
        }
        // final method to take in source string and return Array<Token>
        lex(source) {
            const tokenList = new Array();

            let inM = mantle.lexer.LexMode.Def;
            let buff = "";
            let line = 1;
            let pos = 1;

            for (let c of source) {
                switch (inM) {
                    case mantle.lexer.LexMode.Def: {
                        if (this.isValidVarChar(c)) {
                            buff += c;
                        }
                        else
                        if (c === '/') {
                            if (this.hasLineComments) {
                                buff += c;

                                if (buff.endsWith(`//`)) {
                                    buff = "";
                                    inM = mantle.lexer.LexMode.LCom;
                                }
                            }
                            else
                            if (this.hasMultiComments) {
                                buff += c;
                            }
                            else
                            if (!(this.symbols.includes(c))) {
                                this.throwError(tokenList, c, line, pos);
                            }
                        }
                        else
                        if (c === '*') {
                            buff += c;

                            if (this.hasMultiComments) {
                                if (buff.endsWith(`/*`)) {
                                    inM = mantle.lexer.LexMode.MlCom;
                                }
                            }
                        }
                        else
                        if (c === ' ' || c === '\n' || this.symbols.includes(c)) {
                            if (buff.length > 0) {
                                if (this.keywords.includes(buff)) {
                                    tokenList.push(new mantle.lexer.Token(mantle.lexer.TokenType.Keyword, buff, line, pos));
                                }
                                else {
                                    tokenList.push(new mantle.lexer.Token(mantle.lexer.TokenType.Word, buff, line, pos));
                                }

                                buff = "";
                            }
                            if (this.symbols.includes(c)) {
                                tokenList.push(new mantle.lexer.Token(mantle.lexer.TokenType.Symbol, c, line, pos));
                            }
                        }
                        else
                        if (['\t','\r'].includes(c)) {
                            //
                        }
                        else
                        if (this.stringDelims.includes(c)) {
                            buff += c;
                            inM = mantle.lexer.LexMode.String;
                        }
                        else {
                            this.throwError(tokenList, c, line, pos);
                        }
                        break;
                    }
                    case mantle.lexer.LexMode.String: {
                        buff += c;

                        if (c == buff.charAt(0)) {
                            if ((!(buff.endsWith("\\" + c))) != (buff.endsWith("\\\\" + c))) {
                                tokenList.push(new mantle.lexer.Token(mantle.lexer.TokenType.String, buff, line, pos - buff.length - 1));
                                buff = "";
                                inM = mantle.lexer.LexMode.Def;
                            }
                        }
                        break;
                    }
                    case mantle.lexer.LexMode.LCom: {
                        if (c === '\n') {
                            inM = mantle.lexer.LexMode.Def;
                            buff = "";
                        }
                        break;
                    }
                    case mantle.lexer.LexMode.MlCom: {
                        buff += c;
                        if (buff.endsWith("*/")) {
                            inM = mantle.lexer.LexMode.Def;
                            buff = "";
                        }
                        break;
                    }
                }

                pos += 1;
                if (c !== '\n') continue;
                line += 1;
                pos = 1;
            }

            return tokenList;
        }
        // safe error handling
        throwError(tl, c, l, p, m) {
            throw new Error(`LexerError: Invalid character '${c}' @ ${l}:${p}`);
        }
    });


    // // // // //
    //  Parser  //
    // // // // //

    // base Expression class
    mantle.parser.Expression = (class Expression {
        constructor(t, l, p) {
            this.type = t;
            this.line = l;
            this.pos = p;
        }
    });

    // Expression type that holds one value
    mantle.parser.ExpressionSimple = (class ExpressionSimple extends mantle.parser.Expression {
        constructor(n, l, p, v) {
            super(n, l, p);
            this.value = v;
        }
    });

    // Expression type that holds collection of expressions
    mantle.parser.ExpressionContainer = (class ExpressionContainer extends mantle.parser.Expression {
        constructor(n, a, l, p) {
            super(n, a.length > 0 ? a[0].line : l, a.length > 0 ? a[0].pos : p);
            this.value = a;
        }
    });

    // Parser parse rule
    mantle.parser.ParserParseRule = (class ParserParseRule {
        constructor(ks, os) {
            this.keys = ks;
            this.onSuccess = os;
        }
    });

    // base Parser class inherited by langauge specific implementations
    mantle.parser.Parser = (class Parser {
        constructor() {
            this.rules = new Array();
        }
        // final method to take in Array<Token> and return Expression
        parse(tL) {
            const expList = tL.map((x,i,l) => {
                switch (x.type) {
                    case mantle.lexer.TokenType.Keyword: return new mantle.parser.ExpressionSimple("Key_" + x.value, x.line, x.pos, "");
                    case mantle.lexer.TokenType.Symbol:  return new mantle.parser.ExpressionSimple("Sym_" + x.value, x.line, x.pos, "");
                    case mantle.lexer.TokenType.String:  return new mantle.parser.ExpressionSimple("String", x.line, x.pos, x.value);
                    case mantle.lexer.TokenType.Word:
                        if (this.isValidIdentifier(x.value)) return new mantle.parser.ExpressionSimple("Identifier", x.line, x.pos, x.value);
                        if ((/^([0-9]+)$/).test(x.value))    return new mantle.parser.ExpressionSimple("Integer", x.line, x.pos, parseInt(x.value));
                        this.throwError(x, x.value, x.line, x.pos);
                }
            });

            let len = 0;

            do {
                len = expList.length;

                for (let rule of this.rules) {
                    loop3:
                    for (let i = 0; i < expList.length; i++) {
                        for (let k = 0; k < rule.keys.length; k++) {
                            const l = rule.keys[k];

                            if (i + k >= expList.length) {
                                continue loop3;
                            }
                            if (l.__proto__.constructor === String) {
                                if (!(expList[i + k].type === l)) {
                                    continue loop3;
                                }
                            }
                            if (l.__proto__.constructor === Array) {
                                if (!(l.includes(expList[i + k].type))) {
                                    continue loop3;
                                }
                            }
                        }

                        const exp = rule.onSuccess(expList, i);
                        expList[i] = exp;
                        expList.splice(i + 1, rule.keys.length - 1);

                        if (expList.length === 1) {
                            return expList[0];
                        }
                    }
                }
            }
            while (expList.length !== len);

            console.log(expList);
            throw (new Error('ParserError: AST construction incomplete'));
        }
        // takes in string
        // returns if word is valid ID
        isValidIdentifier() {
            return false;
        }
        // safe error handler
        throwError(t, v, l, p) {
            console.log(t);
            throw new Error(`ParserError: Invalid identifier '${v}' @ ${l}:${p}`);
        }
        // takes in Array<ExpressionType> and Function
        // used in parse() to match patterns of Tokens
        addRule(arr, cb) {
            this.rules.push(new mantle.parser.ParserParseRule(arr, cb));
        }
    });

    if (typeof module !== undefined && 'exports' in module) {
        module.exports = mantle;
    }
    else {
        this.corgi = mantle;
    }
})();
