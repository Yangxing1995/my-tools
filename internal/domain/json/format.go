package json

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
)

// extractJSON 从字符串中提取有效的JSON部分（对象或数组）
func extractJSON(input string) string {
	// 查找第一个 { 或 [
	var startIdx int = -1
	var startChar rune
	for i, ch := range input {
		if ch == '{' || ch == '[' {
			startIdx = i
			startChar = ch
			break
		}
	}

	if startIdx == -1 {
		return input
	}

	// 从startIdx开始，找到匹配的结束符
	endChar := '}'
	if startChar == '[' {
		endChar = ']'
	}

	depth := 0
	inString := false
	escaped := false

	for i := startIdx; i < len(input); i++ {
		ch := rune(input[i])

		if escaped {
			escaped = false
			continue
		}

		if ch == '\\' {
			escaped = true
			continue
		}

		if ch == '"' {
			inString = !inString
			continue
		}

		if inString {
			continue
		}

		if ch == startChar {
			depth++
		} else if ch == endChar {
			depth--
			if depth == 0 {
				return input[startIdx : i+1]
			}
		}
	}

	return input
}

// FormatJSON 格式化JSON字符串
func FormatJSON(input string, indent int) (string, error) {
	in := strings.TrimSpace(input)
	if in == "" {
		return "", errors.New("input is empty")
	}

	// 自动提取有效的JSON部分
	in = extractJSON(in)

	// 尝试解析JSON
	var data interface{}
	decoder := json.NewDecoder(strings.NewReader(in))
	decoder.UseNumber() // 使用json.Number保持数字精度

	if err := decoder.Decode(&data); err != nil {
		return "", errors.New("invalid JSON: " + err.Error())
	}

	// 格式化输出
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false) // 不转义HTML字符

	if indent > 0 {
		encoder.SetIndent("", strings.Repeat(" ", indent))
	}

	if err := encoder.Encode(data); err != nil {
		return "", err
	}

	// 移除末尾的换行符
	result := buf.String()
	return strings.TrimRight(result, "\n"), nil
}

// MinifyJSON 压缩JSON字符串
func MinifyJSON(input string) (string, error) {
	in := strings.TrimSpace(input)
	if in == "" {
		return "", errors.New("input is empty")
	}

	// 自动提取有效的JSON部分
	in = extractJSON(in)

	// 尝试解析JSON
	var data interface{}
	decoder := json.NewDecoder(strings.NewReader(in))
	decoder.UseNumber()

	if err := decoder.Decode(&data); err != nil {
		return "", errors.New("invalid JSON: " + err.Error())
	}

	// 压缩输出
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)

	if err := encoder.Encode(data); err != nil {
		return "", err
	}

	// 移除末尾的换行符
	result := buf.String()
	return strings.TrimRight(result, "\n"), nil
}
