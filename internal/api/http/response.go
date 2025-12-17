package httpapi

type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Response[T any] struct {
	OK    bool   `json:"ok"`
	Data  *T     `json:"data,omitempty"`
	Error *Error `json:"error,omitempty"`
}

func OK[T any](data T) Response[T] {
	return Response[T]{OK: true, Data: &data}
}

func Fail(code, message string) Response[any] {
	return Response[any]{OK: false, Error: &Error{Code: code, Message: message}}
}
