import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { getData, saveData } from '../utils/storage';

export const useClientStore = create((set, get) => ({
    clients: getData("clients") || [],

    addClient: (clientData) => {
        const newClient = { ...clientData, id: uuid() };
        const updatedClients = [...get().clients, newClient];
        set({ clients: updatedClients });
        saveData("clients", updatedClients);
    },

    updateClient: (clientData) => {
        const updatedClients = get().clients.map(c => c.id === clientData.id ? clientData : c);
        set({ clients: updatedClients });
        saveData("clients", updatedClients);
    },

    deleteClient: (id) => {
        const updatedClients = get().clients.filter(c => c.id !== id);
        set({ clients: updatedClients });
        saveData("clients", updatedClients);
    }
}));