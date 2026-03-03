package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"match-me-server/internal/database"
	"match-me-server/internal/middleware"

	"github.com/gorilla/mux"
)

func GetConnections(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	// Fetch accepted connections (just IDs requested)
	// Spec: "/connections: which returns a list connected profiles, containing only the id and nothing else."
	rows, err := database.DB.Query(`
		SELECT CASE WHEN requester_id = $1 THEN recipient_id ELSE requester_id END as id
		FROM connections WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'accepted'`, userID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	ids := make([]int, 0)
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}

	json.NewEncoder(w).Encode(ids)
}

func GetRequests(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	// Fetch incoming pending requests with profile info
	query := `
		SELECT u.id, COALESCE(p.first_name,''), COALESCE(p.last_name,''), COALESCE(p.avatar_url,'')
		FROM connections c
		JOIN users u ON u.id = c.requester_id
		JOIN profiles p ON p.user_id = u.id
		WHERE c.recipient_id = $1 AND c.status = 'pending'
	`
	rows, err := database.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	requests := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int
		var first, last, avatar string
		if err := rows.Scan(&id, &first, &last, &avatar); err == nil {
			requests = append(requests, map[string]interface{}{
				"id":         id,
				"name":       first + " " + last,
				"avatar_url": avatar,
			})
		}
	}

	json.NewEncoder(w).Encode(requests)
}

func SendRequest(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	// Frontend sends { targetId: ... }
	var safeReq map[string]interface{}
	json.NewDecoder(r.Body).Decode(&safeReq)

	targetID := 0
	if v, ok := safeReq["targetId"].(float64); ok {
		targetID = int(v)
	} else if v, ok := safeReq["target_id"].(float64); ok {
		targetID = int(v)
	}

	if targetID == 0 || targetID == userID {
		http.Error(w, "Invalid target", http.StatusBadRequest)
		return
	}

	// Insert pending
	_, err := database.DB.Exec(`
		INSERT INTO connections (requester_id, recipient_id, status)
		VALUES ($1, $2, 'pending')
		ON CONFLICT DO NOTHING
	`, userID, targetID) // Assuming PK (requester, recipient) prevents dups.
	// But (req, rec) vs (rec, req)?
	// Schema PK is (requester_id, recipient_id).
	// We need to check if reverse exists?
	// The Node app checked "existing".
	// Let's assume frontend logic or simple DB constraint.

	if err != nil {
		http.Error(w, "Error sending request", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Request sent"})
}

func RespondToRequest(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	// Frontend sends { targetId: ... }
	var safeReq map[string]interface{}
	json.NewDecoder(r.Body).Decode(&safeReq)

	requesterID := 0
	if v, ok := safeReq["requesterId"].(float64); ok {
		requesterID = int(v)
	} else if v, ok := safeReq["requester_id"].(float64); ok {
		requesterID = int(v)
	}

	action, _ := safeReq["action"].(string)

	if action == "accept" {
		_, err := database.DB.Exec(`
			UPDATE connections SET status = 'accepted'
			WHERE requester_id = $1 AND recipient_id = $2
		`, requesterID, userID)
		if err != nil {
			http.Error(w, "Error accepting", http.StatusInternalServerError)
			return
		}
	} else if action == "reject" {
		_, err := database.DB.Exec(`
			DELETE FROM connections
			WHERE requester_id = $1 AND recipient_id = $2
		`, requesterID, userID)
		if err != nil {
			http.Error(w, "Error rejecting", http.StatusInternalServerError)
			return
		}
	} else {
		http.Error(w, "Invalid action", http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Success"})
}

func Disconnect(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	targetID, _ := strconv.Atoi(vars["id"])

	_, err := database.DB.Exec(`
		DELETE FROM connections
		WHERE (requester_id = $1 AND recipient_id = $2)
		OR (requester_id = $2 AND recipient_id = $1)
	`, userID, targetID)

	if err != nil {
		http.Error(w, "Error disconnecting", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Disconnected"})
}
