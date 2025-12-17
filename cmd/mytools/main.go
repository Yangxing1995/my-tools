package main

import (
	"log"

	"my-tools/internal/server"
)

func main() {
	s := server.New()
	if err := s.Engine.Run(":8111"); err != nil {
		log.Fatal(err)
	}
}
