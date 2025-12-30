package json

import "testing"

func TestExtractJSON(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "纯净的JSON对象",
			input: `{"name":"test"}`,
			want:  `{"name":"test"}`,
		},
		{
			name:  "纯净的JSON数组",
			input: `[1,2,3]`,
			want:  `[1,2,3]`,
		},
		{
			name:  "首尾有空格的JSON对象",
			input: `  {"name":"test"}  `,
			want:  `{"name":"test"}`,
		},
		{
			name:  "前面有无效字符的JSON对象",
			input: `xxxx {"name":"test"}`,
			want:  `{"name":"test"}`,
		},
		{
			name:  "后面有无效字符的JSON对象",
			input: `{"name":"test"} yyy`,
			want:  `{"name":"test"}`,
		},
		{
			name:  "首尾都有无效字符的JSON对象",
			input: `  xxxx {"name":"test"} yyy`,
			want:  `{"name":"test"}`,
		},
		{
			name:  "前面有无效字符的JSON数组",
			input: `xxx [1,2,3]`,
			want:  `[1,2,3]`,
		},
		{
			name:  "后面有无效字符的JSON数组",
			input: `[1,2,3] xxxx`,
			want:  `[1,2,3]`,
		},
		{
			name:  "首尾都有无效字符的JSON数组",
			input: `xxx [1,2,3] xxxx`,
			want:  `[1,2,3]`,
		},
		{
			name:  "嵌套的JSON对象",
			input: `prefix {"outer":{"inner":"value"}} suffix`,
			want:  `{"outer":{"inner":"value"}}`,
		},
		{
			name:  "嵌套的JSON数组",
			input: `prefix [[1,2],[3,4]] suffix`,
			want:  `[[1,2],[3,4]]`,
		},
		{
			name:  "包含字符串的JSON对象",
			input: `text {"key":"value with } and ]"} more`,
			want:  `{"key":"value with } and ]"}`,
		},
		{
			name:  "包含转义字符的JSON",
			input: `prefix {"key":"value with \" quote"} suffix`,
			want:  `{"key":"value with \" quote"}`,
		},
		{
			name:  "没有JSON的字符串",
			input: `no json here`,
			want:  `no json here`,
		},
		{
			name:  "复杂的嵌套结构",
			input: `data: {"users":[{"name":"Alice","age":30},{"name":"Bob","age":25}]} end`,
			want:  `{"users":[{"name":"Alice","age":30},{"name":"Bob","age":25}]}`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractJSON(tt.input)
			if got != tt.want {
				t.Errorf("extractJSON() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatJSON(t *testing.T) {
	type args struct {
		input  string
		indent int
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "格式化压缩的JSON",
			args: args{
				input:  `{"name":"test","age":18,"items":["a","b","c"]}`,
				indent: 2,
			},
			want: `{
  "name": "test",
  "age": 18,
  "items": [
    "a",
    "b",
    "c"
  ]
}`,
			wantErr: false,
		},
		{
			name: "无效的JSON字符串",
			args: args{
				input:  `{"name": "test", "age": }`,
				indent: 2,
			},
			want:    "",
			wantErr: true,
		},
		{
			name: "首尾有无效字符的JSON对象",
			args: args{
				input:  `  xxxx {"name":"test","age":18} yyy`,
				indent: 2,
			},
			want: `{
  "name": "test",
  "age": 18
}`,
			wantErr: false,
		},
		{
			name: "首尾有无效字符的JSON数组",
			args: args{
				input:  `xxx [1,2,3] xxxx`,
				indent: 2,
			},
			want: `[
  1,
  2,
  3
]`,
			wantErr: false,
		},
		{
			name: "使用4个空格缩进",
			args: args{
				input:  `{"name":"test"}`,
				indent: 4,
			},
			want: `{
    "name": "test"
}`,
			wantErr: false,
		},
		{
			name: "空字符串",
			args: args{
				input:  ``,
				indent: 2,
			},
			want:    "",
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := FormatJSON(tt.args.input, tt.args.indent)
			if (err != nil) != tt.wantErr {
				t.Errorf("FormatJSON() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("FormatJSON() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMinifyJSON(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{
			name: "压缩格式化的JSON",
			input: `{
  "name": "test",
  "age": 18,
  "items": [
    "a",
    "b",
    "c"
  ]
}`,
			want:    `{"name":"test","age":18,"items":["a","b","c"]}`,
			wantErr: false,
		},
		{
			name:    "压缩已经压缩的JSON",
			input:   `{"name":"test","age":18}`,
			want:    `{"name":"test","age":18}`,
			wantErr: false,
		},
		{
			name:    "首尾有无效字符的JSON对象",
			input:   `  xxxx {"name":"test"} yyy`,
			want:    `{"name":"test"}`,
			wantErr: false,
		},
		{
			name:    "首尾有无效字符的JSON数组",
			input:   `prefix [1,2,3] suffix`,
			want:    `[1,2,3]`,
			wantErr: false,
		},
		{
			name:    "无效的JSON",
			input:   `{"name": }`,
			want:    "",
			wantErr: true,
		},
		{
			name:    "空字符串",
			input:   ``,
			want:    "",
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := MinifyJSON(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("MinifyJSON() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("MinifyJSON() got = %v, want %v", got, tt.want)
			}
		})
	}
}
