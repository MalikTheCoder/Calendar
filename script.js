document.addEventListener("DOMContentLoaded", () => {
    const datesEl = document.getElementById("dates");
    const monthYearEl = document.getElementById("month-year");
    const selectedDateDisplayEl = document.getElementById("selected-date-display");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const themeToggle = document.getElementById("theme-toggle");
    const eventsList = document.getElementById("events-list");
    const searchInput = document.getElementById("event-search");
    
    let current = new Date();
    let selectedDate = null;
    let currentEvents = [];
  
    // Format date as "Mon, Apr 30"
    const formatDateDisplay = (day, month, year) => {
      const date = new Date(year, month, day);
      return date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
    };
  
    const getStorageKey = (year, month, day) => `${year}-${month + 1}-${day}`;
  
    function renderCalendar(date) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDay = firstDay.getDay();
      const daysInMonth = lastDay.getDate();
      const today = new Date();
  
      monthYearEl.textContent = date.toLocaleDateString("default", {
        month: "long",
        year: "numeric"
      });
  
      datesEl.innerHTML = "";
  
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startDay; i++) {
        const empty = document.createElement("div");
        empty.className = "date empty";
        datesEl.appendChild(empty);
      }
  
      // Create cells for each day in the month
      for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement("div");
        day.className = "date";
        
        // Check if this is today
        if (
          i === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear()
        ) {
          day.classList.add("today");
        }
        
        // Check if this is the selected date
        if (selectedDate && 
            i === selectedDate.day && 
            month === selectedDate.month && 
            year === selectedDate.year) {
          day.classList.add("selected");
        }
  
        // Create day number element
        const dayNumber = document.createElement("div");
        dayNumber.className = "day-number";
        dayNumber.textContent = i;
        day.appendChild(dayNumber);
        
        // Check if this day has events
        const key = getStorageKey(year, month, i);
        const events = JSON.parse(localStorage.getItem(key) || "[]");
        
        // Add event previews if there are events
        if (events.length > 0) {
          const maxPreview = Math.min(events.length, 2);
          for (let j = 0; j < maxPreview; j++) {
            const eventPreview = document.createElement("div");
            eventPreview.className = "event-preview";
            eventPreview.textContent = events[j].title;
            day.appendChild(eventPreview);
          }
          
          // If there are more events than we preview
          if (events.length > maxPreview) {
            const moreEvents = document.createElement("div");
            moreEvents.className = "event-preview";
            moreEvents.textContent = `+${events.length - maxPreview} more`;
            day.appendChild(moreEvents);
          }
        }
  
        // Set up drag and drop functionality
        day.setAttribute("draggable", true);
        day.ondragstart = (e) => {
          day.classList.add("dragging");
          e.dataTransfer.setData("text/plain", i);
        };
        day.ondragend = () => {
          document.querySelectorAll(".date").forEach(d => d.classList.remove("highlight", "dragging"));
        };
        day.ondragover = (e) => {
          e.preventDefault();
          day.classList.add("highlight");
        };
        day.ondragleave = () => {
          day.classList.remove("highlight");
        };
        day.ondrop = (e) => {
          e.preventDefault();
          const fromDay = parseInt(e.dataTransfer.getData("text/plain"));
          moveEvent(year, month, fromDay, i);
        };
        
        // Click handler for selecting a date
        day.onclick = () => {
          document.querySelectorAll(".date").forEach(d => d.classList.remove("selected"));
          day.classList.add("selected");
          renderEvents(year, month, i);
        };
        
        // Only open modal on double click - separate from the onclick handler
        day.ondblclick = (e) => {
          e.stopPropagation(); // Prevent event bubbling
          openModal(year, month, i);
        };
        
        datesEl.appendChild(day);
      }
    }
  
    function openModal(year, month, day) {
      // Remove any existing modals first
      closeModal();
      
      selectedDate = { year, month, day };
      const modal = document.createElement("div");
      modal.className = "modal";
      
      modal.innerHTML = `
        <h3>Add Event</h3>
        <div class="input-group">
          <label for="event-title">Event Title</label>
          <input type="text" id="event-title" placeholder="Enter event title" />
        </div>
        
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" id="repeat-weekly">
            Repeat Weekly
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="repeat-monthly">
            Repeat Monthly
          </label>
        </div>
        
        <div class="modal-buttons">
          <button id="cancel-event" class="btn btn-secondary">Cancel</button>
          <button id="save-event" class="btn btn-primary">Save</button>
        </div>
      `;
  
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      
      // Append elements to the document body
      document.body.appendChild(overlay);
      document.body.appendChild(modal);
      
      // Set up event handlers
      overlay.addEventListener("click", closeModal);
      
      const cancelBtn = document.getElementById("cancel-event");
      const saveBtn = document.getElementById("save-event");
      const titleInput = document.getElementById("event-title");
      
      if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
      if (saveBtn) saveBtn.addEventListener("click", saveEvent);
      
      // Allow Enter key to save
      if (titleInput) {
        titleInput.addEventListener("keyup", (e) => {
          if (e.key === "Enter") saveEvent();
        });
        
        // Focus the input after modal is shown
        setTimeout(() => {
          titleInput.focus();
        }, 100);
      }
    }
  
    function closeModal() {
      const existingModal = document.querySelector(".modal");
      const existingOverlay = document.querySelector(".modal-overlay");
      
      if (existingModal) existingModal.remove();
      if (existingOverlay) existingOverlay.remove();
    }
  
    function saveEvent() {
      const titleInput = document.getElementById("event-title");
      const repeatWeeklyInput = document.getElementById("repeat-weekly");
      const repeatMonthlyInput = document.getElementById("repeat-monthly");
      
      if (!titleInput || !repeatWeeklyInput || !repeatMonthlyInput || !selectedDate) return;
      
      const title = titleInput.value.trim();
      const repeatWeekly = repeatWeeklyInput.checked;
      const repeatMonthly = repeatMonthlyInput.checked;
      
      if (!title) return;
  
      const { year, month, day } = selectedDate;
      const key = getStorageKey(year, month, day);
      const events = JSON.parse(localStorage.getItem(key) || "[]");
      events.push({ title, repeatWeekly, repeatMonthly });
      localStorage.setItem(key, JSON.stringify(events));
  
      if (repeatWeekly) {
        const date = new Date(year, month, day);
        for (let i = 1; i <= 12; i++) {
          date.setDate(date.getDate() + 7);
          const futureKey = getStorageKey(date.getFullYear(), date.getMonth(), date.getDate());
          const futureEvents = JSON.parse(localStorage.getItem(futureKey) || "[]");
          futureEvents.push({ title, repeatWeekly });
          localStorage.setItem(futureKey, JSON.stringify(futureEvents));
        }
      }
  
      if (repeatMonthly) {
        for (let i = 1; i <= 12; i++) {
          const futureMonth = new Date(year, month + i, day);
          const key = getStorageKey(futureMonth.getFullYear(), futureMonth.getMonth(), day);
          const futureEvents = JSON.parse(localStorage.getItem(key) || "[]");
          futureEvents.push({ title, repeatMonthly });
          localStorage.setItem(key, JSON.stringify(futureEvents));
        }
      }
  
      closeModal();
      renderEvents(year, month, day);
      renderCalendar(current); // Refresh calendar to show event indicators
    }
  
    function renderEvents(year, month, day) {
      const key = getStorageKey(year, month, day);
      const events = JSON.parse(localStorage.getItem(key) || "[]");
      currentEvents = events;
      selectedDate = { year, month, day };
      
      // Update selected date display
      selectedDateDisplayEl.textContent = formatDateDisplay(day, month, year);
      
      updateEventList(events);
    }
  
    function updateEventList(events) {
      eventsList.innerHTML = "";
      
      if (events.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "empty-events";
        emptyMessage.textContent = "No events for this day. Double-click on a date to add an event.";
        eventsList.appendChild(emptyMessage);
        return;
      }
      
      events.forEach((event, index) => {
        const div = document.createElement("div");
        div.className = "event";
        div.innerHTML = `
          <span>${event.title}</span>
          <button data-index="${index}">×</button>
        `;
        div.querySelector("button").onclick = () => deleteEvent(index);
        eventsList.appendChild(div);
      });
    }
  
    function deleteEvent(index) {
      const { year, month, day } = selectedDate;
      const key = getStorageKey(year, month, day);
      const events = JSON.parse(localStorage.getItem(key) || "[]");
      events.splice(index, 1);
      localStorage.setItem(key, JSON.stringify(events));
      renderEvents(year, month, day);
      renderCalendar(current); // Refresh calendar to update event indicators
    }
  
    function moveEvent(year, month, fromDay, toDay) {
      const fromKey = getStorageKey(year, month, fromDay);
      const toKey = getStorageKey(year, month, toDay);
      const fromEvents = JSON.parse(localStorage.getItem(fromKey) || "[]");
      const toEvents = JSON.parse(localStorage.getItem(toKey) || "[]");
  
      if (fromEvents.length) {
        const moved = fromEvents.pop();
        toEvents.push(moved);
        localStorage.setItem(fromKey, JSON.stringify(fromEvents));
        localStorage.setItem(toKey, JSON.stringify(toEvents));
      }
  
      if (selectedDate?.day == fromDay) {
        renderEvents(year, month, fromDay);
      } else if (selectedDate?.day == toDay) {
        renderEvents(year, month, toDay);
      }
      
      renderCalendar(current); // Refresh calendar to update event indicators
    }
  
    searchInput.oninput = () => {
      const term = searchInput.value.toLowerCase();
      const filtered = currentEvents.filter(e => e.title.toLowerCase().includes(term));
      updateEventList(filtered);
    };
  
    prevBtn.onclick = () => {
      current.setMonth(current.getMonth() - 1);
      renderCalendar(current);
    };
  
    nextBtn.onclick = () => {
      current.setMonth(current.getMonth() + 1);
      renderCalendar(current);
    };
  
    themeToggle.onclick = () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
    };
  
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      document.body.classList.add("dark");
    }
  
    // Initialize
    renderCalendar(current);
    
    // Select today's date initially
    const today = new Date();
    renderEvents(today.getFullYear(), today.getMonth(), today.getDate());
});