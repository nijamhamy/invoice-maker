import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { getData, saveData } from '../utils/storage';

export const useItemStore = create((set, get) => ({
    items: getData("items") || [],
    
    addItem: (itemData) => {
        const newItem = { ...itemData, id: uuid() };
        const updatedItems = [...get().items, newItem];
        set({ items: updatedItems });
        saveData("items", updatedItems);
    },
    
    updateItem: (itemData) => {
        const updatedItems = get().items.map(i => i.id === itemData.id ? itemData : i);
        set({ items: updatedItems });
        saveData("items", updatedItems);
    },
    
    deleteItem: (id) => {
        const updatedItems = get().items.filter(i => i.id !== id);
        set({ items: updatedItems });
        saveData("items", updatedItems);
    }
}));