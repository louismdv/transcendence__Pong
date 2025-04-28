document.addEventListener('DOMContentLoaded', function () {
    // Fonction utilitaire pour obtenir le token CSRF
    function getCsrfToken() {
        const tokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
        return tokenElement ? tokenElement.value : '';
    }

    // -------------------------------
    // Gestion de l'avatar
    // -------------------------------
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarPreview = document.getElementById('avatar-preview');

    if (avatarUpload && avatarPreview) {
        avatarUpload.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (!file) return;
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                avatarUpload.value = '';
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                avatarUpload.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                avatarPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // -------------------------------
    // Gestion de la soumission du formulaire
    // -------------------------------
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            // Déclenche l'événement 'click' sur le bouton de sauvegarde
            if (saveBtn) {
                saveBtn.dispatchEvent(new Event('click'));
            }
        });
    }

    // Fonction générique pour envoyer les données via AJAX
    async function sendFormData(url, formData) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                },
                body: formData
            });
            if (response.ok) {
                location.reload(); // force reload once language preference updated
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`Erreur serveur: ${response.status} - ${response.statusText}`);
            }
            if (data.status === 'error') {
                throw new Error(data.message || 'Erreur lors de la sauvegarde');
            }
            return data;
        } catch (error) {
            throw error;
        }
    }

    // -------------------------------
    // Gestion du bouton de sauvegarde
    // -------------------------------
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            const activeTab = document.querySelector('.tab-pane.active');
            if (!activeTab) {
                return;
            }
            const formData = new FormData();
            const originalText = saveBtn.innerHTML;
            try {
                // Désactiver le bouton et afficher un spinner
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sauvegarde...';
                let data;
                switch (activeTab.id) {
                    case 'profile':
                        formData.append('action', 'update_profile');
                        formData.append('username', document.getElementById('username').value);
                        if (avatarUpload && avatarUpload.files[0]) {
                            formData.append('avatar', avatarUpload.files[0]);
                        }
                        data = await sendFormData('/settingspage/', formData);
                        if (data.status === 'success' && data.avatar_url) {
                            document.querySelectorAll('.user-avatar').forEach(function (avatar) {
                                avatar.src = data.avatar_url;
                            });
                        }
                        break;
                    case 'account':
                        const newPassword = document.getElementById('new-password').value;
                        const confirmPassword = document.getElementById('confirm-password').value;
                        if (newPassword && newPassword !== confirmPassword) {
                            throw new Error('Les mots de passe ne correspondent pas');
                        }
                        formData.append('action', 'update_account');
                        formData.append('email', document.getElementById('email').value);
                        formData.append('current_password', document.getElementById('current-password').value);
                        formData.append('new_password', newPassword);
                        formData.append('confirm_password', confirmPassword);
                        data = await sendFormData('/settingspage/', formData);
                        break;
                    case 'preferences':
                        formData.append('action', 'update_preferences');
                        formData.append('time_format', document.getElementById('time-format').value);
                        formData.append('timezone', document.getElementById('timezone').value);
                        formData.append('language', document.getElementById('language').value);
                        data = await sendFormData('/settingspage/', formData);
                        break;
                    default:
                        throw new Error('Aucune action reconnue pour l’onglet actif');
                }
                showNotification("Paramètres sauvegardés avec succès");
            } catch (error) {
                console.error('Erreur:', error);
            } finally {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        });
    }

    // Fonction pour afficher une notification toast
    function showNotification(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0 show`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // -------------------------------
    // Gestion de la suppression du compte
    // -------------------------------
    const deleteBtn = document.getElementById('delete-account-btn');
    const confirmDelete = document.getElementById('confirm-delete');
    if (deleteBtn && confirmDelete) {
        deleteBtn.addEventListener('click', function () {
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
            deleteModal.show();
        });
        confirmDelete.addEventListener('click', async function () {
            try {
                const formData = new FormData();
                formData.append('action', 'delete_account');
                formData.append('confirm_deletion', 'true');
                const data = await sendFormData('/settingspage/', formData);
                if (data.status === 'success') {
                    window.location.href = data.redirect || '/login/';
                }
            } catch (error) {
            }
        });
    }
});
