.PHONY: help run test test-all fmt vet build build-linux build-darwin build-windows clean

APP_NAME := mytools
CMD_DIR := ./cmd/mytools
DIST_DIR := ./dist

help:
	@echo "Targets:"
	@echo "  run         - run server (go run ./cmd/mytools)"
	@echo "  test        - run tests for new skeleton (go test ./internal/...)"
	@echo "  test-all    - run all tests (go test ./...)"
	@echo "  fmt         - format Go code (gofmt)"
	@echo "  vet         - go vet ./..."
	@echo "  build       - build for current platform"
	@echo "  build-linux - build linux amd64 binary into ./dist"
	@echo "  build-darwin- build darwin arm64 binary into ./dist"
	@echo "  build-windows - build windows amd64 binary into ./dist"
	@echo "  clean       - remove ./dist"

run:
	go run $(CMD_DIR)

test:
	go test ./internal/...

test-all:
	go test ./...

fmt:
	gofmt -w .

vet:
	go vet ./...

build:
	go build -o $(DIST_DIR)/$(APP_NAME) $(CMD_DIR)

build-linux:
	mkdir -p $(DIST_DIR)
	CGO_ENABLED=0 GO111MODULE=on GOOS=linux GOARCH=amd64 go build -o $(DIST_DIR)/$(APP_NAME)-linux-amd64 $(CMD_DIR)

build-darwin:
	mkdir -p $(DIST_DIR)
	CGO_ENABLED=0 GO111MODULE=on GOOS=darwin GOARCH=arm64 go build -o $(DIST_DIR)/$(APP_NAME)-darwin-arm64 $(CMD_DIR)

build-windows:
	mkdir -p $(DIST_DIR)
	CGO_ENABLED=0 GO111MODULE=on GOOS=windows GOARCH=amd64 go build -o $(DIST_DIR)/$(APP_NAME)-windows-amd64.exe $(CMD_DIR)

clean:
	rm -rf $(DIST_DIR)
