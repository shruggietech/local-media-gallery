// SPDX-License-Identifier: Apache-2.0
//! Bounded inspection values. Never convert a JSON number into a machine number.
use serde::Serialize;

pub const MAX_DOCUMENT_BYTES: usize = 1024 * 1024;
const MAX_DEPTH: usize = 64;
const MAX_NODES: usize = 20_000;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum JsonNode {
    Null,
    Boolean { value: bool },
    String { value: String },
    Number { value: String },
    Array { items: Vec<JsonNode> },
    Object { members: Vec<JsonMember> },
}
#[derive(Clone, Debug, Serialize)]
pub struct JsonMember {
    pub key: String,
    pub value: JsonNode,
}

/// String escapes are decoded with serde_json; all other grammar is lexical.
/// Ordered members preserve duplicates, and source text preserves original escapes.
pub fn parse_metadata_json(source: &str) -> Result<JsonNode, String> {
    if source.len() > MAX_DOCUMENT_BYTES {
        return Err("Resource limit: document exceeds one MiB.".into());
    }
    let mut parser = Parser {
        text: source,
        at: 0,
        nodes: 0,
    };
    let node = parser.value(0)?;
    parser.space();
    if parser.at != source.len() {
        return parser.error("Trailing content.");
    }
    Ok(node)
}
struct Parser<'a> {
    text: &'a str,
    at: usize,
    nodes: usize,
}
impl Parser<'_> {
    fn error<T>(&self, message: &str) -> Result<T, String> {
        Err(format!("{message} (byte {}).", self.at))
    }
    fn byte(&self) -> Option<u8> {
        self.text.as_bytes().get(self.at).copied()
    }
    fn space(&mut self) {
        while self
            .byte()
            .is_some_and(|b| matches!(b, b' ' | b'\t' | b'\r' | b'\n'))
        {
            self.at += 1;
        }
    }
    fn eat(&mut self, byte: u8) -> bool {
        if self.byte() == Some(byte) {
            self.at += 1;
            true
        } else {
            false
        }
    }
    fn string(&mut self) -> Result<String, String> {
        let start = self.at;
        if !self.eat(b'"') {
            return self.error("Expected a quoted member name.");
        }
        let mut escaped = false;
        while let Some(byte) = self.byte() {
            self.at += 1;
            if byte < 0x20 {
                return self.error("Unescaped control in string.");
            }
            if escaped {
                escaped = false;
                continue;
            }
            if byte == b'\\' {
                escaped = true;
                continue;
            }
            if byte == b'"' {
                return serde_json::from_str(&self.text[start..self.at])
                    .map_err(|_| format!("Invalid string escape or unsupported Unicode at byte {start}. Raw source is retained."));
            }
        }
        self.error("Unterminated string.")
    }
    fn value(&mut self, depth: usize) -> Result<JsonNode, String> {
        self.space();
        if depth > MAX_DEPTH || self.nodes >= MAX_NODES {
            return self.error("Resource limit: depth64 or 20,000 values exceeded.");
        }
        self.nodes += 1;
        match self.byte() {
            Some(b'"') => Ok(JsonNode::String {
                value: self.string()?,
            }),
            Some(b'{') => {
                self.at += 1;
                self.space();
                let mut members = Vec::new();
                if self.eat(b'}') {
                    return Ok(JsonNode::Object { members });
                }
                loop {
                    self.space();
                    let key = self.string()?;
                    self.space();
                    if !self.eat(b':') {
                        return self.error("Expected colon.");
                    }
                    let value = self.value(depth + 1)?;
                    members.push(JsonMember { key, value });
                    self.space();
                    if self.eat(b'}') {
                        break;
                    }
                    if !self.eat(b',') {
                        return self.error("Expected comma or closing object.");
                    }
                }
                Ok(JsonNode::Object { members })
            }
            Some(b'[') => {
                self.at += 1;
                self.space();
                let mut items = Vec::new();
                if self.eat(b']') {
                    return Ok(JsonNode::Array { items });
                }
                loop {
                    items.push(self.value(depth + 1)?);
                    self.space();
                    if self.eat(b']') {
                        break;
                    }
                    if !self.eat(b',') {
                        return self.error("Expected comma or closing array.");
                    }
                }
                Ok(JsonNode::Array { items })
            }
            Some(b't') | Some(b'f') | Some(b'n') => {
                for word in ["true", "false", "null"] {
                    if self.text[self.at..].starts_with(word) {
                        self.at += word.len();
                        return Ok(match word {
                            "true" => JsonNode::Boolean { value: true },
                            "false" => JsonNode::Boolean { value: false },
                            _ => JsonNode::Null,
                        });
                    }
                }
                self.error("Unknown JSON literal.")
            }
            Some(b'-' | b'0'..=b'9') => {
                let start = self.at;
                self.eat(b'-');
                if !self.eat(b'0') {
                    if !self.byte().is_some_and(|b| matches!(b, b'1'..=b'9')) {
                        return self.error("Expected number.");
                    }
                    while self.byte().is_some_and(|b| b.is_ascii_digit()) {
                        self.at += 1;
                    }
                }
                if self.eat(b'.') {
                    let digits = self.at;
                    while self.byte().is_some_and(|b| b.is_ascii_digit()) {
                        self.at += 1;
                    }
                    if digits == self.at {
                        return self.error("Expected fraction digits.");
                    }
                }
                if self.eat(b'e') || self.eat(b'E') {
                    if !self.eat(b'+') {
                        self.eat(b'-');
                    }
                    let digits = self.at;
                    while self.byte().is_some_and(|b| b.is_ascii_digit()) {
                        self.at += 1;
                    }
                    if digits == self.at {
                        return self.error("Expected exponent digits.");
                    }
                }
                Ok(JsonNode::Number {
                    value: self.text[start..self.at].into(),
                })
            }
            _ => self.error("Expected a JSON value."),
        }
    }
}
