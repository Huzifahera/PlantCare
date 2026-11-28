// PlantCare - Plant Care Reminders Module

window.PlantCareReminders = (() => {
  const { apiRequest, isAuthenticated } = window.PlantCareAPI;

  let remindersCache = [];

  async function fetchReminders({ plantId = '', isCompleted = '' } = {}) {
    if (!isAuthenticated()) {
      remindersCache = [];
      return [];
    }
    const params = new URLSearchParams();
    if (plantId) params.set('plant', plantId);
    if (isCompleted !== '') params.set('is_completed', isCompleted);
    const query = params.toString() ? `?${params.toString()}` : '';
    remindersCache = await apiRequest(`/api/reminders/${query}`, { method: 'GET' });
    return remindersCache;
  }

  async function createReminder(payload) {
    return apiRequest('/api/reminders/', { method: 'POST', body: payload });
  }

  async function completeReminder(reminderId) {
    return apiRequest(`/api/reminders/${reminderId}/complete/`, { method: 'POST' });
  }

  async function deleteReminder(reminderId) {
    return apiRequest(`/api/reminders/${reminderId}/`, { method: 'DELETE' });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  function populatePlantSelects(plants) {
    const formSelect = document.getElementById('reminderPlantSelect');
    const filterSelect = document.getElementById('reminderFilterPlant');

    if (formSelect) {
      formSelect.innerHTML = plants.length
        ? plants.map((p) => `<option value="${p.id}">${escapeHtml(p.plant_name)}</option>`).join('')
        : '<option value="">No plants yet — add a plant first</option>';
    }

    if (filterSelect) {
      const currentVal = filterSelect.value;
      filterSelect.innerHTML =
        '<option value="">All Plants</option>' +
        plants.map((p) => `<option value="${p.id}">${escapeHtml(p.plant_name)}</option>`).join('');
      filterSelect.value = currentVal;
    }
  }

  function renderReminders() {
    const listEl = document.getElementById('remindersList');
    const panelEl = document.getElementById('remindersPanel');
    if (!listEl || !panelEl) return;

    if (!isAuthenticated()) {
      panelEl.style.display = 'none';
      return;
    }
    panelEl.style.display = 'block';

    if (remindersCache.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding: 20px; color: var(--text-muted);">
          No reminders match the current filter. Create one above!
        </div>
      `;
      return;
    }

    listEl.innerHTML = remindersCache
      .map((rem) => {
        const formattedDate = new Date(rem.reminder_date).toLocaleString();
        const badgeStyle = rem.is_completed
          ? 'background:#def2db; color:#134e38;'
          : 'background:rgba(255,190,59,0.22); color:#8a5a00;';
        const statusText = rem.is_completed ? 'Completed' : 'Pending';

        return `
          <div class="pc-reminder-item ${rem.is_completed ? 'completed' : ''}" data-reminder-id="${rem.id}">
            <div class="pc-reminder-main">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <strong>${escapeHtml(rem.title)}</strong>
                <span class="pc-status-pill" style="${badgeStyle}">${statusText}</span>
                <span class="pc-type-pill">${escapeHtml(rem.reminder_type)}</span>
              </div>
              <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">
                <i class="fa-solid fa-seedling"></i> ${escapeHtml(rem.plant_name)} •
                <i class="fa-regular fa-clock"></i> ${formattedDate}
              </div>
              ${rem.description ? `<p style="font-size:0.84rem; color:var(--text-muted); margin-top:4px;">${escapeHtml(rem.description)}</p>` : ''}
            </div>
            <div class="pc-reminder-actions">
              ${
                rem.is_completed
                  ? ''
                  : `<button class="btn-leaf btn-leaf-sm" data-action="completeReminder" data-id="${rem.id}">
                      <i class="fa-solid fa-check"></i> Complete
                    </button>`
              }
              <button class="btn-glass" style="padding:6px 10px; color:#ff7675;" data-action="deleteReminder" data-id="${rem.id}" title="Delete reminder">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  async function refreshReminders() {
    const plantFilter = document.getElementById('reminderFilterPlant')?.value || '';
    const statusFilter = document.getElementById('reminderFilterStatus')?.value || '';
    await fetchReminders({ plantId: plantFilter, isCompleted: statusFilter });
    renderReminders();
  }

  function initReminderEvents(onToast) {
    const form = document.getElementById('reminderForm');
    const listEl = document.getElementById('remindersList');
    const filterPlant = document.getElementById('reminderFilterPlant');
    const filterStatus = document.getElementById('reminderFilterStatus');
    const errorBox = document.getElementById('reminderErrorMsg');

    if (filterPlant) filterPlant.addEventListener('change', refreshReminders);
    if (filterStatus) filterStatus.addEventListener('change', refreshReminders);

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorBox) errorBox.textContent = '';

        const plantId = document.getElementById('reminderPlantSelect').value;
        const title = document.getElementById('reminderTitleInput').value.trim();
        const reminderType = document.getElementById('reminderTypeSelect').value;
        const reminderDateVal = document.getElementById('reminderDateInput').value;
        const description = document.getElementById('reminderDescInput').value.trim();

        if (!plantId) {
          if (errorBox) errorBox.textContent = 'Please add and select a plant first.';
          return;
        }
        if (!reminderDateVal) {
          if (errorBox) errorBox.textContent = 'Please select a reminder date and time.';
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
          await createReminder({
            plant: Number(plantId),
            title,
            reminder_type: reminderType,
            reminder_date: new Date(reminderDateVal).toISOString(),
            description,
          });
          form.reset();
          await refreshReminders();
          if (onToast) onToast('Reminder created!', '⏰');
        } catch (err) {
          if (errorBox) errorBox.textContent = err.message;
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    if (listEl) {
      listEl.addEventListener('click', async (e) => {
        const completeBtn = e.target.closest('[data-action="completeReminder"]');
        const deleteBtn = e.target.closest('[data-action="deleteReminder"]');

        if (completeBtn) {
          const id = Number(completeBtn.getAttribute('data-id'));
          try {
            await completeReminder(id);
            await refreshReminders();
            if (onToast) onToast('Reminder marked as completed!', '✅');
          } catch (err) {
            if (onToast) onToast(err.message, '⚠️');
          }
          return;
        }

        if (deleteBtn) {
          const id = Number(deleteBtn.getAttribute('data-id'));
          try {
            await deleteReminder(id);
            await refreshReminders();
            if (onToast) onToast('Reminder deleted.', '🗑️');
          } catch (err) {
            if (onToast) onToast(err.message, '⚠️');
          }
        }
      });
    }
  }

  return {
    fetchReminders,
    populatePlantSelects,
    renderReminders,
    refreshReminders,
    initReminderEvents,
  };
})();
