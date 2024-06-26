import React from 'react';
import { toast } from 'react-toastify';

const DeleteConfirmModal = ({ deletingDoctor,refetch,setDeletingDoctor }) => {
    const { name,email } = deletingDoctor;

    const handleDelete = email => {
        fetch(`http://localhost:5000/doctor/${email}`, {
            method: 'DELETE',
            headers: {
                authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
        })
            .then(res => res.json())
            .then(data => {
                console.log(data);
                if (data.deletedCount) {
                    toast.success(`Doctor:${name} is deleted.`)
                    setDeletingDoctor(null);
                    refetch();
                }
            })
    }
    return (
        <div>




            <input type="checkbox" id="delete-confirm-modal" class="modal-toggle" />
            <div class="modal">
                <div class="modal-box">
                    <h3 class="font-bold text-lg text-red-500">Are u sure u want to delete ? ${name}</h3>
                    <p class="py-4">You've been selected for a chance to get one year of subscription to use Wikipedia for free!</p>
                    <div class="modal-action">
                        <button onClick={() => handleDelete(email)} class="btn btn-xs btn-error">delete</button>
                        <label for="delete-confirm-modal" class="btn btn-xs">Cancel!</label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;