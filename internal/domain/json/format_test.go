package json

import "testing"

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
