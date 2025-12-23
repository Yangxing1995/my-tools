.PHONY: help run test test-all fmt vet build build-linux build-darwin build-windows package-linux clean

APP_NAME := mytools
CMD_DIR := ./cmd/mytools
DIST_DIR := ./dist
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

help:
	@echo "Targets:"
	@echo "  run           - run server (go run ./cmd/mytools)"
	@echo "  test          - run tests for new skeleton (go test ./internal/...)"
	@echo "  test-all      - run all tests (go test ./...)"
	@echo "  fmt           - format Go code (gofmt)"
	@echo "  vet           - go vet ./..."
	@echo "  build         - build for current platform"
	@echo "  build-linux   - build linux amd64 binary into ./dist"
	@echo "  build-darwin  - build darwin arm64 binary into ./dist"
	@echo "  build-windows - build windows amd64 binary into ./dist"
	@echo "  package-linux - build and package for Linux deployment (tar.gz)"
	@echo "  clean         - remove ./dist"

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

package-linux:
	$(eval PACKAGE_NAME := $(APP_NAME)-linux-$(VERSION))
	$(eval PACKAGE_DIR := $(DIST_DIR)/$(PACKAGE_NAME))
	@echo "Building Linux binary..."
	mkdir -p $(PACKAGE_DIR)
	CGO_ENABLED=0 GO111MODULE=on GOOS=linux GOARCH=amd64 go build -o $(PACKAGE_DIR)/$(APP_NAME) $(CMD_DIR)
	@echo "Copying web static files..."
	cp -r web $(PACKAGE_DIR)/
	@echo "Creating tar.gz package..."
	cd $(DIST_DIR) && tar -czf $(PACKAGE_NAME).tar.gz $(PACKAGE_NAME)
	@echo "Cleaning up temporary directory..."
	rm -rf $(PACKAGE_DIR)
	@echo "Package created: $(DIST_DIR)/$(PACKAGE_NAME).tar.gz"

clean:
	rm -rf $(DIST_DIR)
