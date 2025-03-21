document.addEventListener('DOMContentLoaded', function() {
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarPreview = document.getElementById('avatar-preview');

    if (avatarUpload && avatarPreview) {
        avatarUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Initialisation du modal Bootstrap
    const deleteBtn = document.getElementById('delete-account-btn');
    const confirmDelete = document.getElementById('confirm-delete');
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
            deleteModal.show();
        });
    }
    
    if (confirmDelete) {
        confirmDelete.addEventListener('click', () => {
            // Code pour supprimer le compte
            alert('Compte supprimé avec succès');
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            deleteModal.hide();
        });
    }

    // Gestion des boutons de sauvegarde et de réinitialisation
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            // Simuler un chargement
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sauvegarde...';
            saveBtn.disabled = true;
            
            // Simuler une requête AJAX
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                alert('Paramètres sauvegardés avec succès');
            }, 1000);
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres?')) {
                // Simuler un chargement
                const originalText = resetBtn.innerHTML;
                resetBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Réinitialisation...';
                resetBtn.disabled = true;
                
                // Réinitialiser les champs
                setTimeout(() => {
                    document.getElementById('username').value = 'utilisateur123';
                    document.getElementById('email').value = 'utilisateur@exemple.com';
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                    document.getElementById('time-format').value = '24h';
                    document.getElementById('timezone').value = 'europe-paris';
                    document.getElementById('language').value = 'fr';
                    avatarPreview.src = '../media/ficello.png';
                    
                    resetBtn.innerHTML = originalText;
                    resetBtn.disabled = false;
                    alert('Paramètres réinitialisés avec succès');
                }, 1000);
            }
        });
    }
});