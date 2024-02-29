package config

import (
	"embed"
)

type Config struct {

	Htmls map[string][]byte
}

var AppConfig *Config

func Init(content embed.FS) {

	AppConfig = &Config{}

	AppConfig.Htmls = make(map[string][]byte)

	// 创建一个路由处理程序，用于加载 HTML 页面

	fss, err := content.ReadDir("static")
	if err != nil {
		panic(err)
	}

	for _, f := range fss {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		data, err := content.ReadFile("static/" + name)
		if err != nil {
			panic(err)
		}
		AppConfig.Htmls[name] = data
	}

}
