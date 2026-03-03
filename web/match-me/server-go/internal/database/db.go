package database

import (
	"database/sql"
	"log"
	"os"
	"time"

	"strings" // Add import

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() {
	var err error
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	if !strings.Contains(dbURL, "sslmode") {
		if strings.Contains(dbURL, "?") {
			dbURL += "&sslmode=disable"
		} else {
			dbURL += "?sslmode=disable"
		}
	}

	// Retry loop for Docker startup timing
	for i := 0; i < 10; i++ {
		DB, err = sql.Open("postgres", dbURL)
		if err == nil {
			err = DB.Ping()
			if err == nil {
				break
			}
		}
		log.Printf("Failed to connect to DB (attempt %d/10): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatal("Could not connect to database after retries: ", err)
	}

	log.Println("Successfully connected to the database!")
}
