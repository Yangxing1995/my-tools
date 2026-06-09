package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"os/user"
	"path/filepath"

	"github.com/kardianos/service"

	"my-tools/internal/server"
)

const serviceName = "wrench"

type program struct {
	addr      string
	staticDir string
}

func (p *program) Start(s service.Service) error {
	go p.run()
	return nil
}

func (p *program) Stop(s service.Service) error {
	return nil
}

func (p *program) run() {
	if err := runServer(p.addr, p.staticDir); err != nil {
		log.Fatal(err)
	}
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		log.Fatal(err)
	}
}

func run(args []string) error {
	if len(args) == 0 {
		return runServe(args)
	}

	switch args[0] {
	case "serve":
		return runServe(args[1:])
	case "install", "uninstall", "start", "stop", "restart", "status":
		return runServiceCommand(args[0], args[1:])
	case "help", "-h", "--help":
		printUsage()
		return nil
	default:
		return runServe(args)
	}
}

func runServe(args []string) error {
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	addr := fs.String("addr", envOrDefault("WRENCH_ADDR", "127.0.0.1:8111"), "listen address")
	staticDir := fs.String("static-dir", envOrDefault("WRENCH_STATIC_DIR", filepath.Join("web", "static")), "static files directory")
	if err := fs.Parse(args); err != nil {
		return err
	}
	return runServer(*addr, *staticDir)
}

func runServer(addr string, staticDir string) error {
	s := server.NewWithStaticDir(staticDir)
	return s.Engine.Run(addr)
}

func runServiceCommand(command string, args []string) error {
	fs := flag.NewFlagSet(command, flag.ExitOnError)
	addr := fs.String("addr", envOrDefault("WRENCH_ADDR", "127.0.0.1:8111"), "service listen address")
	staticDir := fs.String("static-dir", envOrDefault("WRENCH_STATIC_DIR", defaultServiceStaticDir()), "service static files directory")
	userName := fs.String("user", envOrDefault("WRENCH_SERVICE_USER", serviceName), "system service user")
	if err := fs.Parse(args); err != nil {
		return err
	}

	svc, err := newService(*addr, *staticDir, *userName)
	if err != nil {
		return err
	}

	switch command {
	case "install":
		return svc.Install()
	case "uninstall":
		return svc.Uninstall()
	case "start":
		return svc.Start()
	case "stop":
		return svc.Stop()
	case "restart":
		if err := svc.Stop(); err != nil && !errors.Is(err, service.ErrNotInstalled) {
			return err
		}
		return svc.Start()
	case "status":
		status, err := svc.Status()
		if err != nil {
			return err
		}
		fmt.Println(formatStatus(status))
		return nil
	default:
		return fmt.Errorf("unknown service command: %s", command)
	}
}

func newService(addr string, staticDir string, userName string) (service.Service, error) {
	exe, err := os.Executable()
	if err != nil {
		return nil, err
	}
	wd := filepath.Dir(exe)
	if staticDir == "" {
		staticDir = filepath.Join(wd, "web", "static")
	}

	cfg := &service.Config{
		Name:             serviceName,
		DisplayName:      "Wrench",
		Description:      "Local web toolbox. Inputs are processed in the browser and are not uploaded to a server.",
		Executable:       exe,
		WorkingDirectory: wd,
		Arguments: []string{
			"serve",
			"-addr", addr,
			"-static-dir", staticDir,
		},
		Option: service.KeyValue{
			"Restart":    "on-failure",
			"RestartSec": "2",
		},
	}

	if userName != "" && currentUID() == "0" {
		cfg.UserName = userName
	}

	return service.New(&program{addr: addr, staticDir: staticDir}, cfg)
}

func defaultServiceStaticDir() string {
	exe, err := os.Executable()
	if err != nil {
		return filepath.Join("web", "static")
	}
	return filepath.Join(filepath.Dir(exe), "web", "static")
}

func envOrDefault(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func currentUID() string {
	current, err := user.Current()
	if err != nil {
		return ""
	}
	return current.Uid
}

func formatStatus(status service.Status) string {
	switch status {
	case service.StatusRunning:
		return "running"
	case service.StatusStopped:
		return "stopped"
	default:
		return "unknown"
	}
}

func printUsage() {
	fmt.Println(`Usage:
  mytools [serve] [-addr 127.0.0.1:8111] [-static-dir web/static]
  mytools install [-addr 127.0.0.1:8111] [-static-dir /opt/wrench/web/static] [-user wrench]
  mytools uninstall
  mytools start
  mytools stop
  mytools restart
  mytools status`)
}
