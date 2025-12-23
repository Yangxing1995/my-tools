package json

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
)

// FormatJSON 格式化JSON字符串
func FormatJSON(input string, indent int) (string, error) {
	in := strings.TrimSpace(input)
	if in == "" {
		return "", errors.New("input is empty")
	}

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
