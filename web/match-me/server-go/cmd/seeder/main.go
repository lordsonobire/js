package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"os"
	"strings"
	"time"

	// Use initDB logic? Or custom.
	// We can't easily use internal/database.InitDB if it relies on .env in CWD.
	// We'll reimplement simpler connection here or load .env.

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	clean := flag.Bool("clean", false, "Wipe database and re-run schema")
	flag.Parse()

	// Load env
	if err := godotenv.Load(".env"); err != nil {
		godotenv.Load("../../.env")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	if !strings.Contains(dbURL, "sslmode") {
		if strings.Contains(dbURL, "?") {
			dbURL += "&sslmode=disable"
		} else {
			dbURL += "?sslmode=disable"
		}
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if *clean {
		log.Println("🧹 Cleaning database...")
		// Assuming running from project root
		schema, err := ioutil.ReadFile("migrations/schema.sql")
		if err != nil {
			// Try relative to cmd/seeder if running from there
			schema, err = ioutil.ReadFile("../../migrations/schema.sql")
		}
		if err != nil {
			log.Fatal(err)
		}
		_, err = db.Exec(string(schema))
		if err != nil {
			log.Fatal(err)
		}
		log.Println("✅ Database reset.")
	}

	log.Println("🌱 Seeding users...")

	locations := []string{"Helsinki", "Tampere", "Turku", "Oulu", "Espoo", "London", "Paris", "Berlin"}
	genders := []string{"Male", "Female", "Non-binary", "Other"}
	interestsList := []string{"Tech", "Music", "Sports", "Art", "Food", "Travel", "Gaming", "Nature"}

	// Create pseudo-random users
	rand.Seed(time.Now().UnixNano())

	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)

	for i := 0; i < 100; i++ {
		email := fmt.Sprintf("user%d_%d@example.com", i, rand.Intn(10000))

		// Insert User
		var userID int
		err := db.QueryRow("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id", email, string(passwordHash)).Scan(&userID)
		if err != nil {
			log.Printf("Skipping %s (maybe exists)", email)
			continue
		}

		// Profile Data
		first := fmt.Sprintf("User%d", i)
		last := "Test"
		gender := genders[rand.Intn(len(genders))]
		location := locations[rand.Intn(len(locations))]

		// Random Interests (1-3)
		nInt := rand.Intn(3) + 1
		myInterests := []string{}
		for j := 0; j < nInt; j++ {
			myInterests = append(myInterests, interestsList[rand.Intn(len(interestsList))])
		}
		interestsJson, _ := json.Marshal(myInterests)

		// Prefs
		prefLoc := locations[rand.Intn(len(locations))]
		prefs := map[string]string{"preferredLocation": prefLoc, "gender": "Everyone"}
		prefsJson, _ := json.Marshal(prefs)

		// Bio
		bio := "Generated bio for testing purposes."
		if rand.Float32() < 0.2 {
			bio += " I love writing long bios to test the compatibility score bonus!"
		}

		// Birthdate (18-50 years ago)
		age := rand.Intn(32) + 18
		birthdate := time.Now().AddDate(-age, 0, 0)

		lookingFor := "Friendship"
		if rand.Float32() > 0.5 {
			lookingFor = "Chat"
		}

		avatarURL := fmt.Sprintf("https://i.pravatar.cc/150?u=%s", email)

		_, err = db.Exec(`
			INSERT INTO profiles (user_id, first_name, last_name, bio, gender, location, birthdate, looking_for, interests, preferences, avatar_url)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, userID, first, last, bio, gender, location, birthdate, lookingFor, interestsJson, prefsJson, avatarURL)

		if err != nil {
			log.Println("Error inserting profile:", err)
		}
	}

	log.Println("✅ Seeding complete. 100 Users added.")
	log.Println("📍 Locations used:", locations)
}
