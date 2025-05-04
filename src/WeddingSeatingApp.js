import React, { useState, useEffect, useRef } from 'react';

const WeddingSeatingApp = () => {
  // Configuration initiale des tables basée sur le plan
  const initialTableConfig = [
    { id: 1, capacity: 10, label: "Table 1", shape: "rectangle", x: 250, y: 790, rotation: 0, width: 120, height: 60 },
    // Ajoutez d'autres tables selon vos besoins
  ];
  
  // Définitions des dimensions et de l'échelle
  const scaleFactor = 2.5; // 1 unité SVG = 5cm
  
  // États pour la gestion des tables
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const [newGuestName, setNewGuestName] = useState('');
  const [unassignedGuests, setUnassignedGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const [movingSeat, setMovingSeat] = useState(null);
  const [activeSeat, setActiveSeat] = useState(null);
  const [draggingGuest, setDraggingGuest] = useState(null);
  const [panEnabled, setPanEnabled] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [roomDimensions, setRoomDimensions] = useState({
    width: 1000, // 10m en cm
    height: 2500  // 25m en cm
  });
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [hoveredTable, setHoveredTable] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(100); // Taille de la grille en cm (1m)
  const [showLabels, setShowLabels] = useState(true);
const [transparentLabels, setTransparentLabels] = useState(false);

  // Ajoutez cette fonction avec vos autres fonctions utilitaires
const calculateViewBox = () => {
  // Ajouter une marge autour de la salle
  const margin = 100;
  // La salle est positionnée à partir de (0,0) maintenant
  return `${-margin} ${-margin} ${svgRoomWidth + 2*margin} ${svgRoomHeight + 2*margin}`;
};
  
  // Calculer les dimensions SVG de la salle
  const svgRoomWidth = roomDimensions.width / scaleFactor; // 200 unités SVG
  const svgRoomHeight = roomDimensions.height / scaleFactor; // 500 unités SVG

  // Initialiser les tables au chargement
  useEffect(() => {
    // Initialiser chaque table avec un tableau de places vides
    const initializedTables = initialTableConfig.map(table => {
      // Créer un tableau de places pour chaque table
      const seatCount = table.capacity;
      const seats = Array(seatCount).fill(null).map((_, index) => ({
        id: `${table.id}-${index}`,
        index,
        occupant: null
      }));
      
      return {
        ...table,
        seats,
        isSelected: false,
        isMoving: false,
        isRotating: false,
        customSeatPositions: [], // Initialiser cette propriété
        customLabelPositions: [] // Ajoutez cette ligne
      };
    });
    
    setTables(initializedTables);
  }, []);

  // Ajouter un nouvel invité
  const addGuest = () => {
    if (newGuestName.trim() === '') return;
    
    const newGuest = {
      id: `guest-${Date.now()}`,
      name: newGuestName.trim(),
      tableId: null,
      seatId: null
    };
    
    setGuests([...guests, newGuest]);
    setUnassignedGuests([...unassignedGuests, newGuest]);
    setNewGuestName('');
  };

  // Fonction pour déboguer et afficher les positions des sièges d'une table
const debugSeatPositions = (tableId) => {
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  
  console.log(`Positions des sièges pour la table ${table.id} (${table.label}):`);
  console.log(`Forme: ${table.shape}, Capacité: ${table.capacity}`);
  console.log(`Dimensions: ${table.width}x${table.height}`);
  
  table.seats.forEach((seat, index) => {
    const position = calculateSeatPositions(table, index);
    console.log(`Siège ${index}: x=${position.x.toFixed(2)}, y=${position.y.toFixed(2)}`);
  });
};


  // Ajoutez cette fonction pour supprimer un siège d'une table
const removeSeatFromTable = (tableId, seatIndex) => {
  if (!editMode) return;
  
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  
  // Vérifier que ce n'est pas le dernier siège de la table
  if (table.seats.length <= 1) {
    alert("Impossible de supprimer le dernier siège de la table. Supprimez plutôt la table entière.");
    return;
  }
  
  // Si le siège est occupé, libérer l'invité
  const seat = table.seats[seatIndex];
  if (seat.occupant) {
    const guest = guests.find(g => g.id === seat.occupant);
    if (guest) {
      // Mettre à jour l'invité
      const updatedGuests = guests.map(g => {
        if (g.id === guest.id) {
          return { ...g, tableId: null, seatId: null };
        }
        return g;
      });
      
      // Ajouter l'invité aux non assignés
      setUnassignedGuests([...unassignedGuests, guest]);
      
      // Mettre à jour la liste des invités
      setGuests(updatedGuests);
    }
  }
  
  // Supprimer le siège et réorganiser les ID
  setTables(prevTables => {
    return prevTables.map(t => {
      if (t.id !== tableId) return t;
      
      // Filtrer le siège à supprimer
      const updatedSeats = t.seats.filter((_, idx) => idx !== seatIndex);
      
      // Réassigner les indices
      const reindexedSeats = updatedSeats.map((seat, newIdx) => ({
        ...seat,
        id: `${tableId}-${newIdx}`,
        index: newIdx
      }));
      
      // Mettre à jour les positions personnalisées si elles existent
      let updatedCustomPositions = [];
      if (t.customSeatPositions && t.customSeatPositions.length > 0) {
        updatedCustomPositions = t.customSeatPositions
          .filter((_, idx) => idx !== seatIndex); // Supprime la position du siège supprimé
      }
      
      return {
        ...t,
        seats: reindexedSeats,
        capacity: reindexedSeats.length,
        customSeatPositions: updatedCustomPositions
      };
    });
  });
};

// Ajoutez cette fonction pour ajouter un siège à une table
const addSeatToTable = (tableId) => {
  if (!editMode) return;
  
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  
  setTables(prevTables => {
    return prevTables.map(t => {
      if (t.id !== tableId) return t;
      
      // Ajouter un nouveau siège
      const newSeatIndex = t.seats.length;
      const newSeat = {
        id: `${tableId}-${newSeatIndex}`,
        index: newSeatIndex,
        occupant: null
      };
      
      return {
        ...t,
        seats: [...t.seats, newSeat],
        capacity: t.seats.length + 1
      };
    });
  });
};

  // Supprimer un invité
  const removeGuest = (guestId) => {
    // Trouver si l'invité est assigné à une place
    const guestToRemove = guests.find(g => g.id === guestId);
    
    if (guestToRemove && guestToRemove.tableId && guestToRemove.seatId) {
      // Libérer la place
      const updatedTables = tables.map(table => {
        if (table.id === guestToRemove.tableId) {
          const updatedSeats = table.seats.map(seat => {
            if (seat.id === guestToRemove.seatId) {
              return { ...seat, occupant: null };
            }
            return seat;
          });
          
          return { ...table, seats: updatedSeats };
        }
        return table;
      });
      
      setTables(updatedTables);
    }
    
    // Supprimer l'invité
    setGuests(guests.filter(g => g.id !== guestId));
    setUnassignedGuests(unassignedGuests.filter(g => g.id !== guestId));
  };

  // Assigner un invité à une place
  const assignGuestToSeat = (guestId, tableId, seatId) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;
    
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    const seat = table.seats.find(s => s.id === seatId);
    if (!seat) return;
    
    // Vérifier si la place est occupée
    if (seat.occupant) {
      alert("Cette place est déjà occupée!");
      return;
    }
    
    // Si l'invité est déjà assis quelque part, libérer sa place
    if (guest.tableId && guest.seatId) {
      const oldTable = tables.find(t => t.id === guest.tableId);
      if (oldTable) {
        const updatedOldTableSeats = oldTable.seats.map(s => {
          if (s.id === guest.seatId) {
            return { ...s, occupant: null };
          }
          return s;
        });
        
        const updatedTables = tables.map(t => {
          if (t.id === oldTable.id) {
            return { ...t, seats: updatedOldTableSeats };
          }
          return t;
        });
        
        setTables(updatedTables);
      }
    }
    
    // Mettre à jour l'invité
    const updatedGuests = guests.map(g => {
      if (g.id === guestId) {
        return { ...g, tableId, seatId };
      }
      return g;
    });
    
    // Mettre à jour la place
    const updatedTableSeats = table.seats.map(s => {
      if (s.id === seatId) {
        return { ...s, occupant: guest.id };
      }
      return s;
    });
    
    // Mettre à jour la table
    const updatedTables = tables.map(t => {
      if (t.id === tableId) {
        return { ...t, seats: updatedTableSeats };
      }
      return t;
    });
    
    // Mettre à jour les invités non assignés
    setGuests(updatedGuests);
    setTables(updatedTables);
    
    if (guest.tableId === null) {
      setUnassignedGuests(unassignedGuests.filter(g => g.id !== guestId));
    }
    
    setSelectedGuest(null);
  };

  // Retirer un invité d'une place
  const removeGuestFromSeat = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest || !guest.tableId || !guest.seatId) return;
    
    // Libérer la place
    const updatedTables = tables.map(table => {
      if (table.id === guest.tableId) {
        const updatedSeats = table.seats.map(seat => {
          if (seat.id === guest.seatId) {
            return { ...seat, occupant: null };
          }
          return seat;
        });
        
        return { ...table, seats: updatedSeats };
      }
      return table;
    });
    
    // Mettre à jour l'invité
    const updatedGuests = guests.map(g => {
      if (g.id === guestId) {
        return { ...g, tableId: null, seatId: null };
      }
      return g;
    });
    
    // Ajouter l'invité aux non assignés
    setUnassignedGuests([...unassignedGuests, guest]);
    
    setGuests(updatedGuests);
    setTables(updatedTables);
  };

  // Importer des invités depuis un texte (un nom par ligne)
  const importGuests = (event) => {
    const text = event.target.value;
    const names = text.split('\n').filter(name => name.trim() !== '');
    
    const newGuests = names.map(name => ({
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      tableId: null,
      seatId: null
    }));
    
    setGuests([...guests, ...newGuests]);
    setUnassignedGuests([...unassignedGuests, ...newGuests]);
    event.target.value = '';
  };

// Fonction d'export complète mise à jour
const exportConfig = () => {
  // Créer un objet de configuration complet
  const config = {
    // Configuration générale
    roomDimensions: roomDimensions,
    scaleFactor: scaleFactor,
    
    // Tables avec leurs propriétés complètes
    tables: tables.map(table => {
      // Organiser les invités par siège
      const guestsBySeats = [];
      
      table.seats.forEach((seat, index) => {
        if (seat.occupant) {
          const guest = guests.find(g => g.id === seat.occupant);
          guestsBySeats[index] = guest ? { name: guest.name } : null;
        } else {
          guestsBySeats[index] = null;
        }
      });
      
      // Retourner toutes les propriétés importantes de la table
      return {
        id: table.id,
        label: table.label,
        x: table.x,
        y: table.y,
        rotation: table.rotation,
        shape: table.shape,
        type: table.type,
        width: table.width,
        height: table.height,
        capacity: table.capacity,
        radius: table.radius,
        customSeatPositions: table.customSeatPositions || [],
        customLabelPositions: table.customLabelPositions || [], // Ajout de cette ligne
        realWidth: table.realWidth,
        realHeight: table.realHeight,
        seatLayout: table.seatLayout,
        guests: guestsBySeats
      };
    }),
    
    // Liste des invités non assignés
    unassigned: unassignedGuests.map(guest => guest.name)
  };
  
  // Créer et télécharger le fichier
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plan-tables-mariage.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Libérer la ressource
  URL.revokeObjectURL(url);
};

// Fonction d'import améliorée mise à jour
const importConfig = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result);
      
      // Mettre à jour les dimensions de la salle si présentes
      if (config.roomDimensions) {
        setRoomDimensions(config.roomDimensions);
      }
      
      // Liste temporaire pour stocker tous les invités
      const allGuests = [];
      const assignedGuestsMap = new Map();
      
      // Mettre à jour les tables et assigner les invités
      if (config.tables && config.tables.length > 0) {
        const updatedTables = [];
        
        config.tables.forEach(configTable => {
          // Créer l'objet table à partir des données du fichier
          const tableSeats = Array(configTable.capacity || 0).fill(null).map((_, index) => ({
            id: `${configTable.id}-${index}`,
            index,
            occupant: null
          }));
          
          const newTable = {
            id: configTable.id,
            label: configTable.label || `Table ${configTable.id}`,
            shape: configTable.shape || "rectangle",
            type: configTable.type,
            capacity: configTable.capacity || 0,
            width: configTable.width || 120,
            height: configTable.height || 60,
            realWidth: configTable.realWidth,
            realHeight: configTable.realHeight,
            radius: configTable.radius,
            x: configTable.x || 350,
            y: configTable.y || 650,
            rotation: configTable.rotation || 0,
            seats: tableSeats,
            customSeatPositions: configTable.customSeatPositions || [],
            customLabelPositions: configTable.customLabelPositions || [], // Ajout de cette ligne
            seatLayout: configTable.seatLayout,
            isSelected: false,
            isMoving: false,
            isRotating: false
          };
          
          // Ajouter les invités aux sièges
          if (configTable.guests) {
            configTable.guests.forEach((guestInfo, index) => {
              if (index < newTable.seats.length && guestInfo && guestInfo.name) {
                // Créer un ID unique pour cet invité
                const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Créer l'invité
                const guest = {
                  id: guestId,
                  name: guestInfo.name,
                  tableId: newTable.id,
                  seatId: newTable.seats[index].id
                };
                
                // Ajouter à la liste des invités
                allGuests.push(guest);
                
                // Mémoriser l'assignation
                assignedGuestsMap.set(guestInfo.name, guest);
                
                // Assigner l'invité au siège
                newTable.seats[index] = {
                  ...newTable.seats[index],
                  occupant: guestId
                };
              }
            });
          }
          
          updatedTables.push(newTable);
        });
        
        setTables(updatedTables);
      }
      
      // Ajouter les invités non assignés
      if (config.unassigned) {
        const newUnassignedGuests = config.unassigned
          .filter(name => !assignedGuestsMap.has(name)) // Éviter les doublons
          .map(name => ({
            id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            tableId: null,
            seatId: null
          }));
        
        // Ajouter à la liste générale
        allGuests.push(...newUnassignedGuests);
        
        // Mettre à jour les invités non assignés
        setUnassignedGuests(newUnassignedGuests);
      }
      
      // Définir tous les invités
      setGuests(allGuests);
      
      // Réinitialiser la vue
      resetView();
      
      alert('Configuration importée avec succès!');
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
      alert('Erreur lors de l\'importation du fichier. Format invalide.');
    }
  };
  
  reader.readAsText(file);
  event.target.value = null; // Réinitialiser l'input file
};
  // Obtenir les statistiques
  const getTableStats = (table) => {
    const occupiedSeats = table.seats.filter(seat => seat.occupant).length;
    return {
      occupied: occupiedSeats,
      total: table.capacity,
      remaining: table.capacity - occupiedSeats
    };
  };

  // Calculer toutes les statistiques
  const getTotalStats = () => {
    const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
    const totalOccupied = tables.reduce((sum, table) => 
      sum + table.seats.filter(seat => seat.occupant).length, 0);
    
    return {
      total: totalCapacity,
      occupied: totalOccupied,
      remaining: totalCapacity - totalOccupied,
      unassigned: unassignedGuests.length
    };
  };

  const totalStats = getTotalStats();

  // Sélectionner une table pour la déplacer ou la faire pivoter
  const selectTable = (tableId) => {
    if (!editMode) return;
    
    const updatedTables = tables.map(table => ({
      ...table,
      isSelected: table.id === tableId
    }));
    
    setTables(updatedTables);
    setSelectedTable(tableId);
  };

// Modification des fonctions de déplacement des tables
const startMovingTable = (e, tableId) => {
  if (!editMode) return;
  e.stopPropagation();
  e.preventDefault(); // Ajout pour éviter des comportements indésirables
  
  const updatedTables = tables.map(table => ({
    ...table,
    isMoving: table.id === tableId,
    isSelected: table.id === tableId,
    isRotating: false // S'assurer que la rotation est désactivée
  }));
  
  setTables(updatedTables);
  setSelectedTable(tableId);
  
  // Enregistrer la position initiale
  const { clientX, clientY } = e;
  setDragStart({ x: clientX, y: clientY });
  setIsDragging(true);
};

// Gérer le déplacement de la souris pour déplacer les tables
const handleMouseMove = (e) => {
  if (!isDragging || !editMode) return;
  
  const { clientX, clientY } = e;
  const dx = (clientX - dragStart.x) / zoom;
  const dy = (clientY - dragStart.y) / zoom;
  
  const updatedTables = tables.map(table => {
    if (table.isMoving) {
      return {
        ...table,
        x: table.x + dx,
        y: table.y + dy
      };
    }
    return table;
  });
  
  setTables(updatedTables);
  setDragStart({ x: clientX, y: clientY });
};


// Terminer le déplacement
const handleMouseUp = () => {
  if (!isDragging) return;
  
  const updatedTables = tables.map(table => ({
    ...table,
    isMoving: false,
    isRotating: false
  }));
  
  setTables(updatedTables);
  setIsDragging(false);
};

  // Gérer le zoom avec la molette de la souris
  const handleWheel = (e) => {
    if (!showMap) return;
    e.preventDefault();
    
    const delta = e.deltaY;
    const newZoom = Math.max(0.5, Math.min(2, zoom + (delta > 0 ? -0.1 : 0.1)));
    
    // Mettre à jour le zoom
    setZoom(newZoom);
  };


// Fonction améliorée pour le déplacement des sièges
// Fonction totalement repensée pour le déplacement des sièges
const handleSeatDrag = (e, tableId, seatIndex) => {
  if (!editMode) return;
  
  e.stopPropagation();
  e.preventDefault();
  
  // Position initiale de la souris dans l'espace de la fenêtre
  const startX = e.clientX;
  const startY = e.clientY;
  
  // Trouver la table concernée
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  
  // Position actuelle du siège (avant tout déplacement)
  const seatPosition = calculateSeatPositions(table, seatIndex);
  
  // Fonction pour suivre le mouvement de la souris
  const onMouseMove = (moveEvent) => {
    // Calculer le déplacement en pixels dans l'espace de la fenêtre
    const deltaX = (moveEvent.clientX - startX) / zoom;
    const deltaY = (moveEvent.clientY - startY) / zoom;
    
    // Calculer les nouvelles coordonnées absolues
    const newAbsoluteX = seatPosition.x + deltaX;
    const newAbsoluteY = seatPosition.y + deltaY;
    
    // Calculer les coordonnées relatives à la table
    // C'est ici que nous compensons la rotation de la table
    const angle = -(table.rotation || 0) * Math.PI / 180; // Inverser l'angle pour la compensation
    
    // Coordonnées relatives au centre de la table avant rotation
    const relativeToTableX = newAbsoluteX - table.x;
    const relativeToTableY = newAbsoluteY - table.y;
    
    // Appliquer une rotation inverse pour obtenir les coordonnées dans le système non-rotatif de la table
    const rotatedX = relativeToTableX * Math.cos(angle) - relativeToTableY * Math.sin(angle);
    const rotatedY = relativeToTableX * Math.sin(angle) + relativeToTableY * Math.cos(angle);
    
    // Mettre à jour les positions personnalisées
    setTables(prevTables => {
      return prevTables.map(t => {
        if (t.id !== tableId) return t;
        
        // Créer ou mettre à jour le tableau des positions personnalisées
        const customPositions = [...(t.customSeatPositions || [])];
        
        // S'assurer que le tableau est suffisamment grand
        while (customPositions.length <= seatIndex) {
          customPositions.push(null);
        }
        
        // Mettre à jour la position spécifique
        customPositions[seatIndex] = { x: rotatedX, y: rotatedY };
        
        return {
          ...t,
          customSeatPositions: customPositions
        };
      });
    });
  };
  
  // Fonction pour arrêter le déplacement
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  // Ajouter les écouteurs d'événements
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

// Commencer à glisser un invité
const startDraggingGuest = (e, guest) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Marquer cet invité comme étant en cours de glissement
  setDraggingGuest({
    guest: guest,
    initialX: e.clientX,
    initialY: e.clientY
  });
  
  // Ajouter un gestionnaire global temporaire
  window.addEventListener('mousemove', handleGuestDragMove);
  window.addEventListener('mouseup', handleGuestDragEnd);
};

// Gérer le déplacement pendant le glissement
const handleGuestDragMove = (e) => {
  if (!draggingGuest) return;
  
  // Créer ou mettre à jour l'élément visuel
  let dragElement = document.getElementById('guest-drag-visual');
  if (!dragElement) {
    dragElement = document.createElement('div');
    dragElement.id = 'guest-drag-visual';
    dragElement.style.position = 'fixed';
    dragElement.style.backgroundColor = '#4caf50';
    dragElement.style.color = 'white';
    dragElement.style.padding = '6px 12px';
    dragElement.style.borderRadius = '4px';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.zIndex = '9999';
    dragElement.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
    dragElement.style.transform = 'translate(-50%, -50%)';
    dragElement.textContent = draggingGuest.guest.name;
    document.body.appendChild(dragElement);
  }
  
  // Mettre à jour la position
  dragElement.style.left = `${e.clientX}px`;
  dragElement.style.top = `${e.clientY}px`;
};

// Terminer le glissement
const handleGuestDragEnd = (e) => {
  if (!draggingGuest) return;
  
  // Supprimer l'élément visuel
  const dragElement = document.getElementById('guest-drag-visual');
  if (dragElement) {
    document.body.removeChild(dragElement);
  }
  
  // Trouver l'élément sous le curseur
  const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
  let targetTableId = null;
  let targetSeatId = null;
  
  // Parcourir les éléments pour trouver une table ou un siège
  for (const element of elementsAtPoint) {
    const tableId = element.getAttribute('data-table-id');
    const seatId = element.getAttribute('data-seat-id');
    
    if (tableId) targetTableId = parseInt(tableId);
    if (seatId) targetSeatId = seatId;
    
    // Si on a trouvé un siège spécifique, on arrête la recherche
    if (targetTableId && targetSeatId) break;
  }
  
  // Assigner l'invité au siège ou à la table
  if (targetTableId) {
    const table = tables.find(t => t.id === targetTableId);
    
    if (targetSeatId && table) {
      // Assigner à un siège spécifique
      assignGuestToSeat(draggingGuest.guest.id, targetTableId, targetSeatId);
    } else if (table) {
      // Trouver un siège libre
      const emptySeat = table.seats.find(s => !s.occupant);
      if (emptySeat) {
        assignGuestToSeat(draggingGuest.guest.id, targetTableId, emptySeat.id);
      }
    }
  }
  
  // Nettoyer
  setDraggingGuest(null);
  window.removeEventListener('mousemove', handleGuestDragMove);
  window.removeEventListener('mouseup', handleGuestDragEnd);
};



// Assurez-vous que cette fonction est définie dans votre composant WeddingSeatingApp
// Si la fonction n'est pas définie, ajoutez-la:

const startRotatingTable = (e, tableId) => {
  if (!editMode) return;
  e.stopPropagation();
  e.preventDefault(); // Ajout pour éviter des comportements indésirables
  
  // Trouver la table à pivoter
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  
  // Incrémenter la rotation de 15 degrés à chaque clic (24 positions possibles sur 360°)
  const newRotation = (Math.round(table.rotation / 15) * 15 + 15) % 360;
  
  const updatedTables = tables.map(t => {
    if (t.id === tableId) {
      return {
        ...t,
        rotation: newRotation,
        isSelected: true,
        isMoving: false // S'assurer que le déplacement est désactivé
      };
    }
    return {
      ...t,
      isSelected: t.id === tableId,
      isMoving: false
    };
  });
  
  setTables(updatedTables);
  setSelectedTable(tableId);
};







// Puis remplacez la déclaration SVG par celle-ci
<svg 
  viewBox={calculateViewBox()} 
  style={{ 
    width: '100%', 
    height: '100%',
    transform: `scale(${zoom})`,
    transformOrigin: 'center center',
    cursor: isDragging ? 'grabbing' : (panEnabled ? 'move' : 'default')
    
  }}
  onMouseMove={(e) => {
    handleMouseMove(e);
    doPan(e);
  }}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}
  onWheel={handleWheel}
>
  <g transform={`translate(${pan.x}, ${pan.y})`}>
    {/* Contenu SVG... */}
  </g>
</svg>




  // Commencer à déplacer la vue (pan)
const startPan = (e) => {
  // Ne démarrer le pan que si le mode pan est activé
  if (!showMap || isDragging || !panEnabled) return;
  
  const { clientX, clientY } = e;
  setDragStart({ x: clientX, y: clientY });
  setIsDragging(true);
};

  // Déplacer la vue (pan)
  const doPan = (e) => {
    if (!isDragging || !showMap || editMode) return;
    
    const { clientX, clientY } = e;
    const dx = (clientX - dragStart.x) / zoom;
    const dy = (clientY - dragStart.y) / zoom;
    
    setPan({
      x: pan.x + dx,
      y: pan.y + dy
    });
    
    setDragStart({ x: clientX, y: clientY });
  };

/// Fonction pour calculer les positions des sièges autour d'une table ovale
const calculateOvalSeatPositions = (table, seatIndex) => {
  const totalSeats = table.capacity;
  const width = table.width;
  const height = table.height;
  
  let x, y;
  
  if (totalSeats === 10) {
    // Distribution spécifique pour 10 places
    if (seatIndex < 3) {
      // 3 sièges en haut
      const spacing = width / 3;
      x = -width/2 + spacing/2 + seatIndex * spacing;
      y = -height/2 -0;
    } else if (seatIndex < 6) {
      // 3 sièges en bas
      const spacing = width / 3;
      const bottomIndex = seatIndex - 3;
      x = -width/2 + spacing/2 + bottomIndex * spacing;
      y = height/2 + 0;
    } else if (seatIndex < 8) {
      // 2 sièges à gauche
      const spacing = height / 2;
      const leftIndex = seatIndex - 6;
      x = -width/2 - 0;
      y = -height/2 + spacing/2 + leftIndex * spacing;
    } else {
      // 2 sièges à droite
      const spacing = height / 2;
      const rightIndex = seatIndex - 8;
      x = width/2 + 0;
      y = -height/2 + spacing/2 + rightIndex * spacing;
    }
  } else if (totalSeats === 14) {
    // Distribution pour 14 places
    if (seatIndex < 4) {
      // 4 sièges en haut
      if (seatIndex < 2) {
        // 2 sièges sur la première demi-ovale
        const spacing = width / 4;
        x = -width/2 + spacing + seatIndex * spacing;
        y = -height/2 - 0;
      } else {
        // 2 sièges sur la deuxième demi-ovale
        const spacing = width / 4;
        x = width/4 + (seatIndex - 2) * spacing;
        y = -height/2 - 0;
      }
    } else if (seatIndex < 8) {
      // 4 sièges en bas
      if (seatIndex < 6) {
        // 2 sièges sur la première demi-ovale du bas
        const spacing = width / 4;
        const bottomIndex = seatIndex - 4;
        x = -width/2 + spacing + bottomIndex * spacing;
        y = height/2 + 0;
      } else {
        // 2 sièges sur la deuxième demi-ovale du bas
        const spacing = width / 4;
        const bottomIndex = seatIndex - 6;
        x = width/4 + bottomIndex * spacing;
        y = height/2 + 0;
      }
    } else {
      // 6 sièges sur les côtés (3 de chaque côté)
      if (seatIndex < 11) {
        // 3 sièges à gauche
        const spacing = height / 3;
        const leftIndex = seatIndex - 8;
        x = -width/2 - 0;
        y = -height/2 + spacing/2 + leftIndex * spacing;
      } else {
        // 3 sièges à droite
        const spacing = height / 3;
        const rightIndex = seatIndex - 11;
        x = width/2 + 0;
        y = -height/2 + spacing/2 + rightIndex * spacing;
      }
    }
  } else {
    // Distribution générique pour les autres tailles
    // Calculer a et b pour l'ellipse
    const a = width/2 + 5; // Demi-axe horizontal
    const b = height/2 + 5; // Demi-axe vertical
    
    // Calculer les coordonnées sur l'ellipse
    const angle = (seatIndex * 2 * Math.PI) / totalSeats;
    x = a * Math.cos(angle);
    y = b * Math.sin(angle);
  }
  
  return { x, y };
};


// Fonction améliorée pour exporter le plan en PNG
const exportAsPNG = () => {
  // Obtenir le SVG - essayer différents sélecteurs
  const svgElement = document.querySelector('svg') || 
                     document.querySelector('.plan-container svg') ||
                     document.querySelector('[data-testid="plan-svg"]');
  
  if (!svgElement) {
    alert('Erreur: SVG non trouvé. Assurez-vous que le plan est visible.');
    console.error('SVG non trouvé pour l\'export PNG');
    return;
  }
  
  // Cloner le SVG pour ne pas modifier l'original
  const clonedSvg = svgElement.cloneNode(true);
  
  // Définir explicitement les dimensions
  const svgRect = svgElement.getBoundingClientRect();
  clonedSvg.setAttribute('width', svgRect.width);
  clonedSvg.setAttribute('height', svgRect.height);
  
  // S'assurer que le fond est blanc
  const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  backgroundRect.setAttribute('width', '100%');
  backgroundRect.setAttribute('height', '100%');
  backgroundRect.setAttribute('fill', '#f9f9f9');
  clonedSvg.insertBefore(backgroundRect, clonedSvg.firstChild);
  
  // Convertir le SVG en chaîne de caractères
  const svgString = new XMLSerializer().serializeToString(clonedSvg);
  
  // Créer un blob et une URL
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  
  // Créer une image
  const img = new Image();
  img.onload = () => {
    // Créer un canvas avec une résolution doublée
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scale = 2; // Pour une meilleure résolution
    canvas.width = svgRect.width * scale;
    canvas.height = svgRect.height * scale;
    
    // Fond blanc
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Mise à l'échelle pour meilleure qualité
    ctx.scale(scale, scale);
    
    // Dessiner l'image SVG
    ctx.drawImage(img, 0, 0);
    
    // Convertir le canvas en PNG
    try {
      const pngUrl = canvas.toDataURL('image/png');
      
      // Télécharger l'image
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'plan-tables-mariage.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Nettoyer
      URL.revokeObjectURL(svgUrl);
    } catch (error) {
      console.error('Erreur lors de l\'export PNG:', error);
      alert('Erreur lors de l\'export en PNG: ' + error.message);
    }
  };
  
  // Gestion des erreurs de chargement
  img.onerror = (error) => {
    console.error('Erreur de chargement de l\'image SVG:', error);
    alert('Erreur de chargement de l\'image SVG. Vérifiez la console pour plus de détails.');
    URL.revokeObjectURL(svgUrl);
  };
  
  // Charger l'image
  img.src = svgUrl;
  
  // Log pour le débogage
  console.log('Préparation de l\'export PNG, dimensions:', svgRect.width, 'x', svgRect.height);
};

const calculateSeatPositions = (table, seatIndex) => {
  // Si la table n'est pas définie, retourner une position par défaut
  if (!table) return { x: 0, y: 0 };
  
  // Si un siège est activement déplacé, utiliser sa position temporaire
  if (activeSeat && 
      activeSeat.tableId === table.id && 
      activeSeat.seatIndex === seatIndex) {
    
    // Position pendant le déplacement actif
    const angleRad = table.rotation * (Math.PI / 180);
    const rotatedX = activeSeat.position.x * Math.cos(angleRad) - activeSeat.position.y * Math.sin(angleRad);
    const rotatedY = activeSeat.position.x * Math.sin(angleRad) + activeSeat.position.y * Math.cos(angleRad);
    
    return {
      x: table.x + rotatedX,
      y: table.y + rotatedY
    };
  }
  
  // Si la table a des positions personnalisées pour les sièges, les utiliser
  if (table.customSeatPositions && 
      table.customSeatPositions[seatIndex] && 
      (table.customSeatPositions[seatIndex].x !== 0 || table.customSeatPositions[seatIndex].y !== 0)) {
    
    const customPos = table.customSeatPositions[seatIndex];
    // Appliquer la rotation de la table aux coordonnées personnalisées
    const angleRad = table.rotation * (Math.PI / 180);
    const rotatedX = customPos.x * Math.cos(angleRad) - customPos.y * Math.sin(angleRad);
    const rotatedY = customPos.x * Math.sin(angleRad) + customPos.y * Math.cos(angleRad);
    
    return {
      x: table.x + rotatedX,
      y: table.y + rotatedY
    };
  }
  
  // Sinon, calculer les positions par défaut
  const totalSeats = table.capacity;
  
  let x, y;
  
  if (table.shape === "oval") {
    // Utiliser la fonction spécifique pour les tables ovales
    const position = calculateOvalSeatPositions(table, seatIndex);
    x = position.x;
    y = position.y;
  } else if (table.shape === "round") {
    // Pour les tables rondes, positionner les sièges en cercle
    const radius = table.radius + 15; // Rayon autour de la table
    const angle = (seatIndex * 2 * Math.PI) / totalSeats;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  } else {
    // Pour les tables rectangulaires
    const tableWidth = table.width;
    const tableHeight = table.height;
    
    // Configuration spéciale pour les tables de 10 personnes
    if (totalSeats === 10) {
      if (seatIndex < 4) {
        // 4 sièges sur le côté long inférieur
        const spacing = tableWidth / 4;
        x = -tableWidth/2 + spacing/2 + seatIndex * spacing;
        y = tableHeight/2 + 15;
      } else if (seatIndex < 8) {
        // 4 sièges sur le côté long supérieur
        const spacing = tableWidth / 4;
        const upperIndex = seatIndex - 4;
        x = -tableWidth/2 + spacing/2 + upperIndex * spacing;
        y = -tableHeight/2 - 15;
      } else if (seatIndex === 8) {
        // 1 siège en bout de table (à gauche)
        x = -tableWidth/2 - 15;
        y = 0;
      } else {
        // 1 siège en bout de table (à droite)
        x = tableWidth/2 + 15;
        y = 0;
      }
    } else if (totalSeats === 9) {
      // Configuration pour les tables de 9 personnes
      if (seatIndex < 4) {
        // 4 sièges sur le côté long inférieur
        const spacing = tableWidth / 4;
        x = -tableWidth/2 + spacing/2 + seatIndex * spacing;
        y = tableHeight/2 + 15;
      } else if (seatIndex < 8) {
        // 4 sièges sur le côté long supérieur
        const spacing = tableWidth / 4;
        const rightIndex = seatIndex - 4;
        x = -tableWidth/2 + spacing/2 + rightIndex * spacing;
        y = -tableHeight/2 - 15;
      } else {
        // 1 siège en bout de table (à gauche)
        x = -tableWidth/2 - 15;
        y = 0;
      }
    } else {
      // Distribution standard pour les autres tables
      if (seatIndex < Math.ceil(totalSeats / 4)) {
        // Sièges du haut
        const segmentWidth = tableWidth / Math.max(1, Math.ceil(totalSeats / 4));
        x = -tableWidth/2 + segmentWidth/2 + seatIndex * segmentWidth;
        y = -tableHeight/2 - 15;
      } else if (seatIndex < Math.ceil(totalSeats / 2)) {
        // Sièges de droite
        const segmentHeight = tableHeight / Math.max(1, (Math.ceil(totalSeats / 2) - Math.ceil(totalSeats / 4)));
        const adjustedIndex = seatIndex - Math.ceil(totalSeats / 4);
        x = tableWidth/2 + 15;
        y = -tableHeight/2 + segmentHeight/2 + adjustedIndex * segmentHeight;
      } else if (seatIndex < Math.ceil(3 * totalSeats / 4)) {
        // Sièges du bas
        const segmentWidth = tableWidth / Math.max(1, (Math.ceil(3 * totalSeats / 4) - Math.ceil(totalSeats / 2)));
        const adjustedIndex = seatIndex - Math.ceil(totalSeats / 2);
        x = tableWidth/2 - segmentWidth/2 - adjustedIndex * segmentWidth;
        y = tableHeight/2 + 15;
      } else {
        // Sièges de gauche
        const segmentHeight = tableHeight / Math.max(1, (totalSeats - Math.ceil(3 * totalSeats / 4)));
        const adjustedIndex = seatIndex - Math.ceil(3 * totalSeats / 4);
        x = -tableWidth/2 - 15;
        y = tableHeight/2 - segmentHeight/2 - adjustedIndex * segmentHeight;
      }
    }
  }
  
  // Appliquer la rotation de la table aux coordonnées du siège
  const angleRad = table.rotation * (Math.PI / 180);
  const rotatedX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
  const rotatedY = x * Math.sin(angleRad) + y * Math.cos(angleRad);
  
  return {
    x: table.x + rotatedX,
    y: table.y + rotatedY
  };
};






// Ajuster la position des sièges autour d'une table
const adjustSeatPosition = (tableId, seatIndex, offsetX, offsetY) => {
    if (!editMode) return;
    
    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.id === tableId) {
          // Si la table n'a pas encore de positions personnalisées pour les sièges
          let customPositions = table.customSeatPositions || [];
          
          if (customPositions.length === 0) {
            // Créer des positions personnalisées basées sur les positions par défaut
            customPositions = Array(table.seats.length).fill(null).map((_, idx) => {
              // Position par défaut
              const tableWidth = table.width || 120;
              const tableHeight = table.height || 60;
              const totalSeats = table.capacity;
              const isRoundTable = table.shape === 'round';
              
              
              let x, y;
              
              if (isRoundTable) {
                const radius = (table.radius || 40) + 15;
                const angle = (idx * 2 * Math.PI) / totalSeats;
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
              } else {
                // Logique pour tables rectangulaires
                if (idx < Math.ceil(totalSeats / 4)) {
                  const segmentWidth = tableWidth / Math.ceil(totalSeats / 4);
                  x = -tableWidth/2 + segmentWidth/2 + idx * segmentWidth;
                  y = -tableHeight/2 - 15;
                } else if (idx < Math.ceil(totalSeats / 2)) {
                  const segmentHeight = tableHeight / (Math.ceil(totalSeats / 2) - Math.ceil(totalSeats / 4));
                  const adjustedIndex = idx - Math.ceil(totalSeats / 4);
                  x = tableWidth/2 + 15;
                  y = -tableHeight/2 + segmentHeight/2 + adjustedIndex * segmentHeight;
                } else if (idx < Math.ceil(3 * totalSeats / 4)) {
                  const segmentWidth = tableWidth / (Math.ceil(3 * totalSeats / 4) - Math.ceil(totalSeats / 2));
                  const adjustedIndex = idx - Math.ceil(totalSeats / 2);
                  x = tableWidth/2 - segmentWidth/2 - adjustedIndex * segmentWidth;
                  y = tableHeight/2 + 15;
                } else {
                  const segmentHeight = tableHeight / (totalSeats - Math.ceil(3 * totalSeats / 4));
                  const adjustedIndex = idx - Math.ceil(3 * totalSeats / 4);
                  x = -tableWidth/2 - 15;
                  y = tableHeight/2 - segmentHeight/2 - adjustedIndex * segmentHeight;
                }
              }
              
              return { x, y };
            });
          }
          
          // Copie profonde pour éviter de modifier l'état directement
          const newCustomPositions = [...customPositions];
          
          // S'assurer que la position existe pour cet index
          if (!newCustomPositions[seatIndex]) {
            newCustomPositions[seatIndex] = { x: 0, y: 0 };
          }
          
          // Mettre à jour la position du siège spécifique
          newCustomPositions[seatIndex] = {
            x: newCustomPositions[seatIndex].x + offsetX,
            y: newCustomPositions[seatIndex].y + offsetY
          };
          
          return {
            ...table,
            customSeatPositions: newCustomPositions
          };
        }
        return table;
      });
    });
  };


  // Composant pour afficher une table dans la vue liste
  const TableListView = ({ table }) => {
    const stats = getTableStats(table);
    const assignedGuests = table.seats
      .filter(seat => seat.occupant)
      .map(seat => {
        const guest = guests.find(g => g.id === seat.occupant);
        return guest ? guest : { id: seat.occupant, name: "Inconnu" };
      });
    
    return (
      <div className="border border-gray-300 rounded-lg p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">{table.label}</h3>
          <span className="bg-gray-100 px-2 py-1 rounded text-sm">
            {stats.occupied}/{stats.total}
          </span>
        </div>
        
        <div className="max-h-40 overflow-y-auto">
        {assignedGuests.length === 0 ? (
  <p 
    className="text-gray-500 italic"
    data-table-id={table.id}
  >
    Aucun invité assigné
  </p>
) : (
            assignedGuests.map(guest => (
              <div key={guest.id} className="bg-blue-50 p-2 mb-1 rounded flex justify-between items-center">
                <span>{guest.name}</span>
                <button
                  onClick={() => removeGuestFromSeat(guest.id)}
                  className="text-red-500 p-1 rounded hover:bg-red-100"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Réinitialiser la vue (zoom et pan)
const resetView = () => {
  setZoom(1);
  setPan({ x: 0, y: 0 });
};


// Définition des modèles de tables ovales avec le type correct
// Définition des modèles de tables ovales composites
const compositeOvalTemplates = {
  "oval-10": {
    id: "oval-10",
    label: "Ovale 10 places",
    capacity: 10,
    width: 300, // Largeur totale en cm
    height: 150, // Hauteur en cm
    type: "compositeOval",
    shape: "compositeOval", // Important: définir shape aussi
    seatLayout: [
      { position: "top", count: 3 },
      { position: "bottom", count: 3 },
      { position: "left", count: 2 },
      { position: "right", count: 2 }
    ]
  },
  "oval-14": {
    id: "oval-14",
    label: "Ovale 14 places",
    capacity: 14,
    width: 450, // Largeur totale en cm
    height: 150, // Hauteur en cm
    type: "compositeOval",
    shape: "compositeOval", // Important: définir shape aussi
    seatLayout: [
      { position: "top", count: 4 },
      { position: "bottom", count: 4 },
      { position: "left", count: 3 },
      { position: "right", count: 3 }
    ]
  }
};


// Définir les modèles de tables disponibles
const tableTemplates = {
  oval: {
    shape: "oval",
    templates: [
      compositeOvalTemplates["oval-10"],
      compositeOvalTemplates["oval-14"],
      { id: "oval-12", label: "Ovale 12 places", capacity: 12, width: 330, height: 150, type: "oval" },
      { id: "oval-16", label: "Ovale 16 places", capacity: 16, width: 480, height: 150, type: "oval" }
    ]
  },
  rectangle: {
    shape: "rectangle",
    templates: [
      { id: "rect-6", label: "Rectangle 6 places", capacity: 6, width: 150, height: 74, type: "rectangle" },
      { id: "rect-8", label: "Rectangle 8 places", capacity: 8, width: 180, height: 74, type: "rectangle" },
      { id: "rect-10", label: "Rectangle 10 places", capacity: 10, width: 200, height: 100, type: "rectangle" },
      { id: "rect-12", label: "Rectangle 12 places", capacity: 12, width: 300, height: 94, type: "rectangle" }
    ]
  }
};

// Fonction pour calculer le prochain ID de table disponible
const getNextTableId = () => {
  if (tables.length === 0) return 1;
  const maxId = Math.max(...tables.map(table => table.id));
  return maxId + 1;
};

const addNewTable = (template, position = null) => {
  // Générer un nouvel ID unique (assurez-vous qu'il s'agit d'un nombre et non d'une chaîne)
  const newId = Number(getNextTableId());
  
  // Calculer la position par défaut (centre de la vue) si non fournie
  const defaultPosition = position || {
    x: svgRoomWidth/2, // Centre de la salle (ajusté)
    y: svgRoomHeight/2  // Centre de la salle (ajusté)
  };
  
  // Appliquer le même facteur d'échelle que la salle
  const scaledWidth = template.width / scaleFactor;
  const scaledHeight = template.height / scaleFactor;
  
  // Créer le tableau des sièges
  const seats = Array(template.capacity).fill(null).map((_, index) => ({
    id: `${newId}-${index}`,
    index,
    occupant: null
  }));
  
  // Créer la nouvelle table avec des valeurs par défaut explicites
  const newTable = {
    id: newId,
    label: `Table ${newId}`,
    shape: template.shape || template.type, // Utiliser shape s'il existe, sinon type
    capacity: template.capacity,
    width: scaledWidth,
    height: scaledHeight,
    realWidth: template.width,
    realHeight: template.height,
    x: defaultPosition.x,
    y: defaultPosition.y,
    rotation: 0,
    seats: seats,
    isSelected: false,
    isMoving: false,
    isRotating: false,
    customSeatPositions: []
  };
  
  console.log("Nouvelle table ajoutée:", newTable); // Permet de vérifier les propriétés
  
  // Ajouter la table à la liste
  setTables(prevTables => [...prevTables, newTable]);
  
  // Sélectionner automatiquement la nouvelle table pour la déplacer immédiatement
  setSelectedTable(newId);
  
  // Désactiver le mode d'ajout
  setSelectedTemplate(null);
};

// Fonction pour supprimer une table
const deleteTable = (tableId) => {
  // Trouver tous les invités assignés à cette table
  const assignedGuests = guests.filter(guest => guest.tableId === tableId);
  
  // Mettre à jour les invités pour qu'ils soient non assignés
  const updatedGuests = guests.map(guest => {
    if (guest.tableId === tableId) {
      return { ...guest, tableId: null, seatId: null };
    }
    return guest;
  });
  
  // Ajouter les invités à la liste des non assignés
  setUnassignedGuests([...unassignedGuests, ...assignedGuests]);
  
  // Mettre à jour la liste des invités
  setGuests(updatedGuests);
  
  // Supprimer la table
  setTables(tables.filter(table => table.id !== tableId));
  
  // Désélectionner si c'était la table sélectionnée
  if (selectedTable === tableId) {
    setSelectedTable(null);
  }
};

const TableTemplateSelector = ({ onSelect, onCancel }) => {
  const [selectedType, setSelectedType] = useState('oval');
  
  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Ajouter une nouvelle table</h2>
        
        {/* Sélection du type de table */}
        <div className="mb-4">
          <div className="flex gap-4 mb-2">
            <button 
              className={`p-2 rounded ${selectedType === 'oval' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedType('oval')}
            >
              Tables ovales
            </button>
            <button 
              className={`p-2 rounded ${selectedType === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedType('rectangle')}
            >
              Tables rectangulaires
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {tableTemplates[selectedType].templates.map(template => (
              <div 
                key={template.id}
                className="border border-gray-300 p-3 rounded hover:bg-blue-50 cursor-pointer"
                onClick={() => onSelect(template)}
              >
                <h3 className="font-bold">{template.label}</h3>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{template.capacity} places</span>
                  <span>{template.width}x{template.height} cm</span>
                </div>
                <div className="mt-2 flex justify-center">
                  {template.type === 'oval' ? (
                    <div 
                      className="bg-gray-100 border border-gray-400" 
                      style={{ 
                        width: `${template.width / 10}px`, 
                        height: `${template.height / 10}px`,
                        borderRadius: '50%'
                      }}
                    />
                  ) : (
                    <div 
                      className="bg-gray-100 border border-gray-400" 
                      style={{ 
                        width: `${template.width / 10}px`, 
                        height: `${template.height / 10}px`
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant pour configurer les dimensions de la salle
const RoomSettingsModal = () => {
  const [tempWidth, setTempWidth] = useState(roomDimensions.width / 100); // Convertir en mètres
  const [tempHeight, setTempHeight] = useState(roomDimensions.height / 100); // Convertir en mètres
  
  const handleSave = () => {
    // Convertir en cm pour le stockage interne
    setRoomDimensions({
      width: Math.max(500, Math.min(5000, tempWidth * 100)), // Min 5m, Max 50m
      height: Math.max(500, Math.min(5000, tempHeight * 100)) // Min 5m, Max 50m
    });
    setShowRoomSettings(false);
    
    // Réinitialiser la vue après le changement de dimensions
    resetView();
  };
  
  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Dimensions de la salle</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Largeur (en mètres)</label>
          <input
            type="number"
            value={tempWidth}
            onChange={(e) => setTempWidth(parseFloat(e.target.value) || 0)}
            min="5"
            max="50"
            step="0.5"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Longueur (en mètres)</label>
          <input
            type="number"
            value={tempHeight}
            onChange={(e) => setTempHeight(parseFloat(e.target.value) || 0)}
            min="5"
            max="50"
            step="0.5"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowRoomSettings(false)}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

const TableTooltip = ({ table, isVisible, position }) => {
  if (!isVisible || !table) return null;
  
  return (
    <div 
      className="absolute bg-white shadow-lg border border-gray-300 p-2 rounded z-50"
      style={{ 
        left: `${position.x + 20}px`, 
        top: `${position.y + 20}px`,
        pointerEvents: 'none'
      }}
    >
      <h3 className="font-bold">{table.label}</h3>
      <div className="text-sm">
        <p>Type: {table.shape === 'oval' ? 'Ovale' : (table.shape === 'round' ? 'Ronde' : 'Rectangle')}</p>
        <p>Dimensions: {table.realWidth}x{table.realHeight} cm</p>
        <p>Capacité: {table.capacity} places</p>
        <p>Places occupées: {table.seats.filter(seat => seat.occupant).length}/{table.capacity}</p>
      </div>
    </div>
  );
};


const removeTableSeat = (tableId, seatIndex) => {
  if (!editMode) return;
  
  setTables(prevTables => {
    return prevTables.map(table => {
      if (table.id !== tableId) return table;
      
      // Vérifier si l'invité est assigné au siège
      const seatToRemove = table.seats[seatIndex];
      if (seatToRemove && seatToRemove.occupant) {
        // Retrouver l'invité
        const guest = guests.find(g => g.id === seatToRemove.occupant);
        if (guest) {
          // Ajouter l'invité à la liste des invités non assignés
          setUnassignedGuests(prev => [...prev, { ...guest, tableId: null, seatId: null }]);
          
          // Mettre à jour l'état de l'invité
          setGuests(prev => prev.map(g => {
            if (g.id === guest.id) {
              return { ...g, tableId: null, seatId: null };
            }
            return g;
          }));
        }
      }
      
      // Créer un nouveau tableau de sièges sans le siège supprimé
      const newSeats = table.seats.filter((_, index) => index !== seatIndex);
      
      // Mettre à jour la capacité
      const newCapacity = table.capacity - 1;
      
      // Recalculer les indices des sièges
      const updatedSeats = newSeats.map((seat, idx) => ({
        ...seat,
        id: `${table.id}-${idx}`,
        index: idx
      }));
      
      // Mettre à jour les positions personnalisées des sièges et des étiquettes
      let newCustomSeatPositions = [];
      let newCustomLabelPositions = [];
      
      if (table.customSeatPositions) {
        newCustomSeatPositions = table.customSeatPositions
          .filter((_, index) => index !== seatIndex);
      }
      
      if (table.customLabelPositions) {
        newCustomLabelPositions = table.customLabelPositions
          .filter((_, index) => index !== seatIndex);
      }
      
      return {
        ...table,
        seats: updatedSeats,
        capacity: newCapacity,
        customSeatPositions: newCustomSeatPositions,
        customLabelPositions: newCustomLabelPositions
      };
    });
  });
};


// Fonction pour rendre une table ovale en composants (rectangles + demi-cercles)
const renderCompositeOvalTable = (table) => {
  // Vérifier que les propriétés nécessaires existent
  const width = table.width || 100;
  const height = table.height || 50;
  
  // Une table ovale est composée d'un rectangle central et de deux demi-cercles aux extrémités
  return (
    <>
      {/* Rectangle central */}
      <rect 
        x={-(width/2 - height/2)} 
        y={-height/2} 
        width={width - height} 
        height={height} 
        fill="#fff" 
        stroke="none"
      />
      
      {/* Demi-cercle gauche */}
      <path 
        d={`M ${-(width/2 - height/2)} ${-height/2} 
            A ${height/2} ${height/2} 0 0 0 ${-(width/2 - height/2)} ${height/2}`}
        fill="#fff" 
        stroke="none"
      />
      
      {/* Demi-cercle droit */}
      <path 
        d={`M ${width/2 - height/2} ${-height/2} 
            A ${height/2} ${height/2} 0 0 1 ${width/2 - height/2} ${height/2}`}
        fill="#fff" 
        stroke="none"
      />
      
      {/* Contour externe */}
      <rect 
        x={-(width/2 - height/2)} 
        y={-height/2} 
        width={width - height} 
        height={height} 
        fill="none" 
        stroke={table.isSelected ? "#ff5722" : "#333"} 
        strokeWidth={table.isSelected ? "3" : "2"}
      />
      
      <path 
        d={`M ${-(width/2 - height/2)} ${-height/2} 
            A ${height/2} ${height/2} 0 0 0 ${-(width/2 - height/2)} ${height/2}
            M ${width/2 - height/2} ${-height/2} 
            A ${height/2} ${height/2} 0 0 1 ${width/2 - height/2} ${height/2}`}
        fill="none" 
        stroke={table.isSelected ? "#ff5722" : "#333"} 
        strokeWidth={table.isSelected ? "3" : "2"}
      />
    </>
  );
};





// Fonction améliorée pour le rendu de la grille
const renderGrid = () => {
  if (!showGrid) return null;
  
  const lines = [];
  // Convertir la taille de la grille en unités SVG
  const gridSizeSVG = gridSize / scaleFactor;
  
  // Générer les lignes verticales
  for (let x = 0; x <= svgRoomWidth; x += gridSizeSVG) {
    lines.push(
      <line 
        key={`vline-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={svgRoomHeight}
        stroke="#ccc"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
    );
    
    // Ajouter des étiquettes de dimensions (tous les 5m)
    if (x % (gridSizeSVG * 5) === 0 || x === 0) {
      lines.push(
        <text
          key={`vlabel-${x}`}
          x={x}
          y={-10}
          textAnchor="middle"
          fill="#999"
          fontSize="12"
        >
          {(x / gridSizeSVG * gridSize / 100).toFixed(1)}m
        </text>
      );
    }
  }
  
  // Générer les lignes horizontales
  for (let y = 0; y <= svgRoomHeight; y += gridSizeSVG) {
    lines.push(
      <line 
        key={`hline-${y}`}
        x1={0}
        y1={y}
        x2={svgRoomWidth}
        y2={y}
        stroke="#ccc"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
    );
    
    // Ajouter des étiquettes de dimensions (tous les 5m)
    if (y % (gridSizeSVG * 5) === 0 || y === 0) {
      lines.push(
        <text
          key={`hlabel-${y}`}
          x={-10}
          y={y + 5}
          textAnchor="end"
          fill="#999"
          fontSize="12"
        >
          {(y / gridSizeSVG * gridSize / 100).toFixed(1)}m
        </text>
      );
    }
  }
  
  return lines;
};






const GridControl = () => (
  <div className="flex items-center gap-2 mb-2">
    <label className="flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={showGrid}
        onChange={() => setShowGrid(!showGrid)}
        className="mr-2"
      />
      Afficher la grille
    </label>
    
    {showGrid && (
      <select
        value={gridSize}
        onChange={(e) => setGridSize(parseInt(e.target.value))}
        className="border border-gray-300 rounded p-1 text-sm"
      >
        <option value="50">50cm</option>
        <option value="100">1m</option>
        <option value="200">2m</option>
      </select>
    )}
  </div>
);









  return (
    <div className="flex flex-col h-full bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Planificateur de Places de Mariage</h1>
      
      <div className="flex flex-wrap gap-4">
        {/* Panneau de gauche - Contrôles */}
<div className="w-full md:w-1/3 bg-white rounded-lg p-4 shadow">
  <h2 className="text-xl font-bold mb-4">Invités</h2>

  {/* Contrôles de gestion des tables */}
  <div className="mb-4 p-2 border border-gray-300 rounded bg-gray-50">
    <h3 className="font-bold mb-2">Gestion des tables</h3>
    
    {/* Bouton pour configurer les dimensions de la salle */}
    <div className="flex gap-2 mb-2">
      <button
        onClick={() => setShowRoomSettings(true)}
        className="flex-1 bg-blue-500 text-white p-2 rounded"
      >
        Configurer la salle
      </button>
    </div>
    
    <div className="flex gap-2">

    
<button 
  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
  onClick={exportAsPNG}
>
  Exporter en PNG
</button>


  <button
    className={`px-2 py-1 rounded ${showLabels ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
    onClick={() => setShowLabels(!showLabels)}
    title={showLabels ? "Masquer les étiquettes" : "Afficher les étiquettes"}
  >
    {showLabels ? "Masquer étiquettes" : "Afficher étiquettes"}
  </button>
  
  {showLabels && (
    <button
      className={`px-2 py-1 rounded ${transparentLabels ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
      onClick={() => setTransparentLabels(!transparentLabels)}
      title={transparentLabels ? "Étiquettes opaques" : "Étiquettes transparentes"}
    >
      {transparentLabels ? "Étiquettes opaques" : "Étiquettes transparentes"}
    </button>
  )}



      <button
        onClick={() => setShowTemplateSelector(true)}
        className="flex-1 bg-green-500 text-white p-2 rounded"
      >
        Ajouter une table
      </button>
      {selectedTable && (
       
       <button
          onClick={() => deleteTable(selectedTable)}
          className="flex-1 bg-red-500 text-white p-2 rounded"
        >
          Supprimer la table {tables.find(t => t.id === selectedTable)?.label}
        </button>
      )}
    </div>
    
    <div className="mt-2 text-xs text-gray-600">
      <p>Dimensions de la salle: {roomDimensions.width/100}m x {roomDimensions.height/100}m</p>
      <p>Échelle: 1 unité = 5cm</p>
    </div>
  </div>
  
  {/* AJOUTEZ LE BLOC DE GESTION DES SIÈGES ICI */}
  {editMode && selectedTable && (
    <div className="mt-4 p-2 border border-gray-300 rounded bg-gray-50">
      <h3 className="font-bold mb-2">Gestion des sièges</h3>
      <div className="flex justify-between items-center mb-2">
        <span>
          Table {tables.find(t => t.id === selectedTable)?.label} : 
          {tables.find(t => t.id === selectedTable)?.seats.length} sièges
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => addSeatToTable(selectedTable)}
          className="flex-1 bg-green-500 text-white p-2 rounded"
        >
          Ajouter un siège
        </button>
        <button
          onClick={() => {
            const tableIndex = tables.findIndex(t => t.id === selectedTable);
            if (tableIndex >= 0) {
              debugSeatPositions(selectedTable);
            }
          }}
          className="flex-1 bg-blue-500 text-white p-2 rounded"
        >
          Infos sièges
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        <p>Pour supprimer un siège, cliquez sur le point rouge au-dessus du siège en mode édition</p>
      </div>
    </div>
  )}
  
          
          {/* Ajout d'invité */}
          <div className="flex mb-4">
            <input
              type="text"
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addGuest()}
              placeholder="Nom de l'invité"
              className="flex-1 p-2 border border-gray-300 rounded-l"
            />
            <button
              onClick={addGuest}
              className="bg-blue-500 text-white p-2 rounded-r"
            >
              Ajouter
            </button>
          </div>
          
          {/* Recherche */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un invité..."
            className="w-full p-2 border border-gray-300 rounded mb-4"
          />
          
          {/* Import/Export */}
          <div className="flex flex-col gap-2 mb-4">
            <textarea
              placeholder="Importer des invités (un par ligne)"
              onChange={importGuests}
              className="w-full p-2 border border-gray-300 rounded"
              rows="3"
            />
            <div className="flex gap-2">
              <button
                onClick={exportConfig}
                className="flex-1 bg-green-500 text-white p-2 rounded"
              >
                Exporter
              </button>
              <label className="flex-1 bg-indigo-500 text-white p-2 rounded text-center cursor-pointer">
                Importer
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfig}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          
          {/* Contrôles de vue et d'édition */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowMap(!showMap)}
                className="flex-1 p-2 bg-gray-200 rounded"
              >
                {showMap ? 'Vue liste' : 'Vue plan'}
              </button>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex-1 p-2 rounded ${editMode ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
              >
                {editMode ? 'Quitter édition' : 'Éditer plan'}
              </button>
            </div>
            
            {showMap && (
  <>
    <GridControl />
    <div className="flex gap-2">

    
    <button
      onClick={() => setPanEnabled(!panEnabled)}
      className={`flex-1 p-2 rounded ${panEnabled ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
    >
      {panEnabled ? 'Désactiver déplacement' : 'Activer déplacement'}
    </button>
    <button
      onClick={resetView}
      className="flex-1 p-2 bg-gray-200 rounded"
    >
      Réinitialiser vue
    </button>



  </div>

  </>
)}
          </div>
          
          {/* Invités non assignés */}
<div>
  <h3 className="font-bold mb-2">Invités non assignés ({unassignedGuests.length})</h3>
  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-2">
    {unassignedGuests.length === 0 ? (
      <p className="text-gray-500 italic">Tous les invités sont assignés</p>
    ) : (
      unassignedGuests
        .filter(guest => !searchTerm || guest.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(guest => (
          <div
  key={guest.id}
  className={`p-2 mb-1 rounded cursor-grab flex justify-between items-center ${
    selectedGuest?.id === guest.id ? 'bg-blue-100' : 'bg-gray-50'
  }`}
  onClick={() => setSelectedGuest(guest)}
  onMouseDown={(e) => startDraggingGuest(e, guest)}
>
  <span>{guest.name}</span>
  <button
    onClick={(e) => {
      e.stopPropagation();
      removeGuest(guest.id);
    }}
    className="text-red-500 p-1 rounded hover:bg-red-100"
  >
    ✕
  </button>
</div>
        ))
    )}
  </div>
</div>
          
          {/* Statistiques */}
          <div className="mt-4 border border-gray-200 rounded p-3">
            <h3 className="font-bold mb-2">Statistiques</h3>
            <p>Total invités: {guests.length}</p>
            <p>Non assignés: {unassignedGuests.length}</p>
            <p>Places totales: {totalStats.total}</p>
            <p>Places restantes: {totalStats.remaining}</p>
          </div>
        </div>
        
        {/* Panneau de droite - Plan ou Liste */}
        <div className="w-full md:w-3/5 bg-white rounded-lg p-4 shadow">
          <h2 className="text-xl font-bold mb-4">
            {showMap ? 'Plan de Salle' : 'Liste des Tables'}
            {editMode && showMap && ' (Mode Édition)'}
          </h2>
          
          {showMap ? (
  <div 
    className="relative border border-gray-300 rounded" 
    style={{ width: '100%', height: '1200px', overflow: 'auto' }}
    onMouseDown={startPan}
    onMouseMove={(e) => {
      handleMouseMove(e);
      doPan(e);
    }}
    onMouseUp={handleMouseUp}
    onMouseLeave={handleMouseUp}
    onWheel={handleWheel}
    ref={svgRef}
  >
    {/* Tooltip pour les informations de table au survol */}
    {hoveredTable && (
      <TableTooltip 
        table={hoveredTable.table}
        isVisible={!!hoveredTable}
        position={hoveredTable.position}
      />
    )}
    
    <svg 
      viewBox={`-100 -100 ${svgRoomWidth + 200} ${svgRoomHeight + 200}`}
      style={{ 
        width: '100%', 
        height: '100%',
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
        cursor: isDragging ? 'grabbing' : (panEnabled ? 'move' : 'default')
      }}
      onMouseMove={(e) => {
        handleMouseMove(e);
        doPan(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <g transform={`translate(${pan.x}, ${pan.y})`}>
        {/* Fond de plan */}
        <rect 
          x="0" 
          y="0" 
          width={svgRoomWidth} 
          height={svgRoomHeight} 
          fill="#f5f5f5" 
          stroke="#ccc" 
          strokeWidth="2" 
        />
        
        {/* Grille de dimensions */}
        {renderGrid()}
        
        {tables.map(table => {
          const isRoundTable = table.shape === 'round';
          const isOvalTable = table.shape === 'oval' || table.shape === 'compositeOval';
          const tableStats = getTableStats(table);
          const isTableSelected = table.isSelected;
          
          return (
            <g 
              key={`table-${table.id}`} 
              transform={`translate(${table.x}, ${table.y}) rotate(${table.rotation})`}
              onClick={() => selectTable(table.id)}
              onMouseEnter={(e) => {
                setHoveredTable({
                  table,
                  position: { x: e.clientX, y: e.clientY }
                });
              }}
              onMouseLeave={() => setHoveredTable(null)}
              onMouseMove={(e) => {
                if (hoveredTable) {
                  setHoveredTable({
                    ...hoveredTable,
                    position: { x: e.clientX, y: e.clientY }
                  });
                }
              }}
              data-table-id={table.id}
              style={{ cursor: editMode ? 'pointer' : 'default' }}
            >
              {/* Forme de la table */}
              {isRoundTable ? (
  <circle 
    cx={0} 
    cy={0} 
    r={table.radius || 40}
    fill="#fff" 
    stroke={isTableSelected ? "#ff5722" : "#333"} 
    strokeWidth={isTableSelected ? "3" : "2"}
    onMouseDown={(e) => startMovingTable(e, table.id)}
  />
) : isOvalTable ? (
  table.shape === 'compositeOval' ? (
    <g onMouseDown={(e) => startMovingTable(e, table.id)}>
      {renderCompositeOvalTable(table)}
    </g>
  ) : (
    <ellipse 
      cx={0} 
      cy={0} 
      rx={table.width/2} 
      ry={table.height/2}
      fill="#fff" 
      stroke={isTableSelected ? "#ff5722" : "#333"} 
      strokeWidth={isTableSelected ? "3" : "2"}
      onMouseDown={(e) => startMovingTable(e, table.id)}
    />
  )
) : (
  <rect 
    x={-(table.width/2)} 
    y={-(table.height/2)} 
    width={table.width} 
    height={table.height} 
    fill="#fff" 
    stroke={isTableSelected ? "#ff5722" : "#333"} 
    strokeWidth={isTableSelected ? "3" : "2"}
    onMouseDown={(e) => startMovingTable(e, table.id)}
  />
)}
              
              {/* Numéro et statistiques de la table */}
              <text 
                x={0} 
                y={-5} 
                textAnchor="middle" 
                fill="#ff0000" 
                fontSize="20" 
                fontWeight="bold"
                pointerEvents="none"
              >
                {table.id}
              </text>
              <text 
                x={0} 
                y={15} 
                textAnchor="middle" 
                fill="#000" 
                fontSize="14"
                pointerEvents="none"
              >
                {tableStats.occupied}/{tableStats.total}
              </text>
              
              {/* Contrôle de rotation (visible uniquement en mode édition et si la table est sélectionnée) */}
              {editMode && isTableSelected && (
                <g>
                  <line 
                    x1={0} 
                    y1={0} 
                    x2={0} 
                    y2={-60} 
                    stroke="#ff5722" 
                    strokeWidth="2" 
                    strokeDasharray="4"
                  />
                  <circle
                    cx={0}
                    cy={-60}
                    r={10}
                    fill="#ff5722"
                    stroke="#fff"
                    strokeWidth="2"
                    style={{ cursor: 'alias' }}
                    onMouseDown={(e) => startRotatingTable(e, table.id)}
                  />
                </g>
              )}
              
              {/* Bouton de suppression (visible uniquement en mode édition et si la table est sélectionnée) */}
              {editMode && isTableSelected && (
                <g
                  transform="translate(0, 0)"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTable(table.id);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={isOvalTable || isRoundTable ? table.width/2 + 20 : table.width/2 + 15}
                    cy={0}
                    r={12}
                    fill="#ff0000"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <text
                    x={isOvalTable || isRoundTable ? table.width/2 + 20 : table.width/2 + 15}
                    y={4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="16"
                    fontWeight="bold"
                  >
                    ✕
                  </text>
                </g>
              )}
            </g>
          );
        
        
        })}
        
       {/* Rendu des sièges et des étiquettes */}

{tables.map(table => 
  table.seats.map((seat, index) => {
    const position = calculateSeatPositions(table, index);
    const isOccupied = seat.occupant !== null;
    const guest = isOccupied ? guests.find(g => g.id === seat.occupant) : null;
    const isTableSelected = table.id === selectedTable;
    
    // Obtenir les positions personnalisées des étiquettes si elles existent
    const customLabelPosition = table.customLabelPositions && 
                              table.customLabelPositions[index] ? 
                              table.customLabelPositions[index] : 
                              null;
    
    // Calculer la position pour positionner l'étiquette
    let angle = Math.atan2(position.y - table.y, position.x - table.x);
    if (angle < 0) angle += 2 * Math.PI;
    const degrees = angle * 180 / Math.PI;
    
    // Déterminer de quel côté placer l'étiquette (haut, bas, gauche, droite)
    let labelPosition = "";
    if (degrees >= 315 || degrees < 45) labelPosition = "right";
    else if (degrees >= 45 && degrees < 135) labelPosition = "bottom";
    else if (degrees >= 135 && degrees < 225) labelPosition = "left";
    else labelPosition = "top";
    
    // Calculer le décalage de l'étiquette selon sa position
    let labelX = position.x;
    let labelY = position.y;
    let textAnchor = "middle";
    
    switch (labelPosition) {
      case "right":
        labelX = position.x + 20;
        textAnchor = "start";
        break;
      case "left":
        labelX = position.x - 20;
        textAnchor = "end";
        break;
      case "top":
        labelY = position.y - 20;
        break;
      case "bottom":
        labelY = position.y + 20;
        break;
    }
    
    // Appliquer les positions personnalisées si elles existent
    if (customLabelPosition) {
      labelX = position.x + customLabelPosition.x;
      labelY = position.y + customLabelPosition.y;
      textAnchor = "middle"; // Toujours au milieu pour les positions personnalisées
    }
    
    // Gérer le déplacement des étiquettes - VERSION SIMPLIFIÉE ET PLUS ROBUSTE
    const handleLabelDrag = (e) => {
      if (!editMode) return;
      e.stopPropagation();
      e.preventDefault();
      
      // Position initiale de la souris
      const startX = e.clientX;
      const startY = e.clientY;
      
      // Position actuelle ou par défaut de l'étiquette
      const initialOffsetX = customLabelPosition ? customLabelPosition.x : (labelX - position.x);
      const initialOffsetY = customLabelPosition ? customLabelPosition.y : (labelY - position.y);
      
      // Fonction pour suivre le mouvement de la souris
      const onMouseMove = (moveEvent) => {
        const deltaX = (moveEvent.clientX - startX) / zoom;
        const deltaY = (moveEvent.clientY - startY) / zoom;
        
        const newOffset = {
          x: initialOffsetX + deltaX,
          y: initialOffsetY + deltaY
        };
        
        // Mettre à jour l'état avec la nouvelle position
        setTables(prevTables => {
          return prevTables.map(t => {
            if (t.id !== table.id) return t;
            
            // Créer une copie des positions d'étiquettes
            const newLabelPositions = [...(t.customLabelPositions || [])];
            
            // S'assurer que le tableau a la bonne taille
            while (newLabelPositions.length <= index) {
              newLabelPositions.push(null);
            }
            
            // Mettre à jour la position
            newLabelPositions[index] = newOffset;
            
            return {
              ...t,
              customLabelPositions: newLabelPositions
            };
          });
        });
      };
      
      // Fonction pour arrêter le déplacement
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      // Ajouter les écouteurs d'événements
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };


    // Fonction de rotation bidirectionnelle
const handleTableRotation = (e, tableId, direction = "clockwise") => {
  if (!editMode) return;
  
  e.stopPropagation();
  
  // Déterminer l'angle d'incrémentation selon la direction
  const rotationIncrement = direction === "clockwise" ? 15 : -15;
  
  setTables(prevTables => {
    return prevTables.map(table => {
      if (table.id !== tableId) return table;
      
      let newRotation = (table.rotation || 0) + rotationIncrement;
      
      // Normaliser la rotation entre 0 et 360 degrés
      newRotation = ((newRotation % 360) + 360) % 360;
      
      return {
        ...table,
        rotation: newRotation
      };
    });
  });
};




// Fonction pour dupliquer une table
const duplicateTable = (tableId) => {
  // Trouver la table à dupliquer
  const tableToClone = tables.find(table => table.id === tableId);
  
  if (!tableToClone) return;
  
  // Générer un nouvel ID pour la table dupliquée
  const newId = Date.now();
  
  // Créer une copie profonde de la table
  const clonedTable = JSON.parse(JSON.stringify(tableToClone));
  
  // Créer la nouvelle table avec un décalage de position
  const newTable = {
    ...clonedTable,
    id: newId,
    label: `${tableToClone.label} (copie)`,
    x: tableToClone.x + 30,
    y: tableToClone.y + 30,
    isSelected: false,
    isMoving: false,
    isRotating: false
  };
  
  // Recréer les sièges avec de nouveaux IDs
  newTable.seats = clonedTable.seats.map((seat, index) => ({
    id: `${newId}-${index}`,
    index,
    occupant: null // Ne pas dupliquer les invités assignés
  }));
  
  // Conserver les positions personnalisées des sièges
  if (clonedTable.customSeatPositions && clonedTable.customSeatPositions.length > 0) {
    newTable.customSeatPositions = [...clonedTable.customSeatPositions];
  }
  
  // Conserver les positions personnalisées des étiquettes (mais sans invités)
  if (clonedTable.customLabelPositions && clonedTable.customLabelPositions.length > 0) {
    newTable.customLabelPositions = [...clonedTable.customLabelPositions];
  }
  
  // Ajouter la table au plan
  setTables(prevTables => [...prevTables, newTable]);
  
  // Sélectionner la nouvelle table
  setSelectedTable(newId);
};

    
    return (
      
      <g key={`seat-${seat.id}`}>
        {/* Bouton de suppression de siège - Ajout de cette partie */}
        {editMode && isTableSelected && (
          <circle
            cx={position.x}
            cy={position.y - 17}
            r="6"
            fill="#ff5252"
            stroke="#333"
            strokeWidth="1"
            onClick={(e) => {
              e.stopPropagation();
              removeTableSeat(table.id, index);
            }}
            style={{ cursor: 'pointer' }}
          />
        )}

<div className="plan-container">
      {/* Le panneau de contrôle doit être ici */}
      {selectedTable && editMode && (
        <div className="selected-table-controls" style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          zIndex: 1000  // Assurez-vous qu'il est au-dessus des autres éléments
        }}>
          <h3>Table {tables.find(t => t.id === selectedTable)?.label}</h3>
          
          <div className="buttons-container" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              className="control-btn"
              onClick={(e) => handleTableRotation(e, selectedTable, "counterclockwise")}
              style={{
                padding: '5px 10px',
                background: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ↺ Rotation G
            </button>
            
            <button
              className="control-btn"
              onClick={(e) => handleTableRotation(e, selectedTable, "clockwise")}
              style={{
                padding: '5px 10px',
                background: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ↻ Rotation D
            </button>
            
            <button
              className="control-btn"
              onClick={() => duplicateTable(selectedTable)}
              style={{
                padding: '5px 10px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              + Dupliquer
            </button>
          </div>
        </div>
      )}

      {/* Votre SVG du plan existant */}
      <svg width="100%" height="100%">
        {/* Contenu du SVG */}
      </svg>
    </div>
  );
}
        
        {/* Le cercle du siège */}
        <circle
          cx={position.x}
          cy={position.y}
          r="8"
          fill={isOccupied ? "#4caf50" : "#ccc"}
          stroke={isTableSelected ? "#ff5722" : "#333"}
          strokeWidth={isTableSelected ? "2" : "1"}
          data-table-id={table.id}
          data-seat-id={seat.id}
          data-seat-index={index}
          onClick={() => {
            if (!editMode) {
              if (selectedGuest && !isOccupied) {
                assignGuestToSeat(selectedGuest.id, table.id, seat.id);
              } else if (isOccupied && guest) {
                removeGuestFromSeat(guest.id);
              }
            }
          }}
          onMouseDown={(e) => {
            if (editMode && isTableSelected) {
              handleSeatDrag(e, table.id, index);
              e.stopPropagation();
            }
          }}
          style={{ 
            cursor: editMode 
              ? (isTableSelected ? 'move' : 'default') 
              : (isOccupied ? 'pointer' : (selectedGuest ? 'copy' : 'default')) 
          }}
        />
        
        {/* Lien entre le siège et l'étiquette */}
        {isOccupied && guest && (
          <line
            x1={position.x}
            y1={position.y}
            x2={labelX}
            y2={labelY}
            stroke="#4caf50"
            strokeWidth="0.8"
            strokeDasharray="3,2"
            strokeOpacity="0.7"
          />
        )}
        
        {/* Étiquette avec fond */}
        {isOccupied && guest && showLabels && (
  <g 
    cursor={editMode ? 'grab' : 'default'} 
    onMouseDown={editMode ? handleLabelDrag : null}
  >
    {/* Zone de prise plus grande mais invisible */}
    <rect
      x={labelX - 40}
      y={labelY - 15}
      width="80"
      height="30"
      fill="transparent"
      style={{ pointerEvents: editMode ? 'all' : 'none' }}
    />
    
    {/* Fond blanc pour le texte avec transparence conditionnelle */}
    <rect
      x={labelX - 35}
      y={labelY - 8}
      width="60"
      height="16"
      rx="8"
      ry="8"
      fill={transparentLabels ? "rgba(255, 255, 255, 0.4)" : "white"}
      stroke="#4caf50"
      strokeWidth="1"
      strokeOpacity={transparentLabels ? 0.6 : 1}
      style={{ pointerEvents: 'none' }}
    />
    
    {/* Le texte lui-même */}
    <text
      x={labelX}
      y={labelY + 4}
      fontSize="8"
      fontWeight="bold"
      fill="#333"
      textAnchor="middle"
      dominantBaseline="middle"
      style={{
        textShadow: transparentLabels ? "none" : "0px 0px 2px white, 0px 0px 2px white, 0px 0px 2px white, 0px 0px 2px white",
        pointerEvents: "none"
      }}
    >
      {guest.name}
    </text>
  </g>
)}

{/* La ligne de connexion doit également être conditionnelle */}
{isOccupied && guest && showLabels && (
  <line
    x1={position.x}
    y1={position.y}
    x2={labelX}
    y2={labelY}
    stroke="#4caf50"
    strokeWidth="0.8"
    strokeDasharray="3,2"
    strokeOpacity={transparentLabels ? 0.4 : 0.7}
  />
)}
      </g>
    );
  })





)}

      </g>
    </svg>
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {tables.map(table => (
      <div 
        key={table.id} 
        className="..." 
        data-table-id={table.id}
      >
        <TableListView table={table} />
      </div>
  ))}





</div>
          )}




          
        </div>
      </div>
      
      {/* Instructions */}
<div className="mt-4 bg-white rounded-lg p-4 shadow">
  <h3 className="font-bold mb-2">
    {editMode ? 'Mode Édition' : 'Comment utiliser:'}
  </h3>
  
  {editMode ? (
    <ul className="list-disc ml-5">
      <li>Cliquez sur une table pour la sélectionner</li>
      <li>Faites glisser une table pour la déplacer</li>
      <li>Cliquez sur le point rouge pour faire pivoter la table de 45°</li>
      <li>Quand une table est sélectionnée, vous pouvez déplacer ses sièges individuellement</li>
      <li>Cliquez sur "Réinitialiser" pour revenir à la disposition initiale</li>
      <li>Cliquez sur "Quitter édition" lorsque vous avez terminé</li>
    </ul>
  ) : (
    <ol className="list-decimal ml-5">
      <li>Ajoutez des invités individuellement ou importez-les (un nom par ligne)</li>
      <li>Pour placer un invité, soit :
        <ul className="list-disc ml-5">
          <li>Sélectionnez-le puis cliquez sur un siège vide</li>
          <li>Faites-le glisser directement sur un siège ou une table</li>
        </ul>
      </li>
      <li>Cliquez sur un siège occupé pour retirer l'invité</li>
      <li>Utilisez le bouton "Vue liste" pour voir et gérer les tables sous forme de liste</li>
      <li>Pour déplacer ou faire pivoter les tables, cliquez sur "Éditer plan"</li>
      <li>Utilisez la molette de la souris ou les boutons pour zoomer/dézoomer</li>
      <li>Faites glisser le plan pour le déplacer</li>
    </ol>
  )}
</div>

{/* Ajout du sélecteur de modèle de table */}
{showTemplateSelector && (
  <TableTemplateSelector 
    onSelect={(template) => {
      setSelectedTemplate(template);
      addNewTable(template);
      setShowTemplateSelector(false);
    }}
    onCancel={() => setShowTemplateSelector(false)}
  />
)}


{/* Modal de configuration de la salle */}
{showRoomSettings && <RoomSettingsModal />}


    </div>
  );
};

export default WeddingSeatingApp;