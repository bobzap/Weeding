import React, { useState, useEffect, useRef } from 'react';

const WeddingSeatingApp = () => {
  // Configuration initiale des tables basée sur le plan
  const initialTableConfig = [
    { id: 1, capacity: 10, label: "Table 1", shape: "rectangle", x: 250, y: 790, rotation: 0, width: 120, height: 60, realWidth: 120 * 5, realHeight: 60 * 5 },
    // Ajoutez d'autres tables selon vos besoins
  ];
  
  // Templates de tables disponibles
  const tableTemplates = [
    { id: 'rect-standard', label: 'Rectangle Standard', shape: 'rectangle', width: 120, height: 60, capacity: 10, realWidth: 120 * 5, realHeight: 60 * 5 },
    { id: 'rect-large', label: 'Rectangle Large', shape: 'rectangle', width: 220, height: 90, capacity: 14, realWidth: 220 * 5, realHeight: 90 * 5 },
    { id: 'round-small', label: 'Rond Petit', shape: 'round', radius: 40, capacity: 6, realWidth: 40 * 2 * 5, realHeight: 40 * 2 * 5 },
    { id: 'round-medium', label: 'Rond Moyen', shape: 'round', radius: 60, capacity: 8, realWidth: 60 * 2 * 5, realHeight: 60 * 2 * 5 },
    { id: 'round-large', label: 'Rond Grand', shape: 'round', radius: 80, capacity: 10, realWidth: 80 * 2 * 5, realHeight: 80 * 2 * 5 },
    { id: 'oval-small', label: 'Ovale Petit', shape: 'oval', width: 140, height: 80, capacity: 8, realWidth: 140 * 5, realHeight: 80 * 5 },
    { id: 'oval-large', label: 'Ovale Grand', shape: 'oval', width: 180, height: 100, capacity: 12, realWidth: 180 * 5, realHeight: 100 * 5 },
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
  const [roomSettingsForm, setRoomSettingsForm] = useState({
    width: roomDimensions.width / 100, // Convertir en mètres pour l'interface
    height: roomDimensions.height / 100
  });
  const [hoveredTable, setHoveredTable] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(100); // Taille de la grille en cm (1m)
  const [showLabels, setShowLabels] = useState(true);
  const [transparentLabels, setTransparentLabels] = useState(false);
  const [zones, setZones] = useState([]); // État pour les zones déplaçables
  const [showMeasureTool, setShowMeasureTool] = useState(false);
  const [measurePoints, setMeasurePoints] = useState(null);
  const [showCustomTableForm, setShowCustomTableForm] = useState(false);
  const [customTableForm, setCustomTableForm] = useState({
    width: 120,
    height: 60,
    capacity: 10
  });
  const [editingGuest, setEditingGuest] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [editTableForm, setEditTableForm] = useState({
    templateId: '',
    customWidth: 0,
    customHeight: 0,
    customCapacity: 0
  });
  const [showTableTypeModal, setShowTableTypeModal] = useState(false);

  // Calculer les dimensions SVG de la salle
  const svgRoomWidth = roomDimensions.width / scaleFactor;
  const svgRoomHeight = roomDimensions.height / scaleFactor;

  const [newTableName, setNewTableName] = useState('');


  // Calculer le viewBox pour le SVG
  const calculateViewBox = () => {
    const margin = 100;
    return `${-margin} ${-margin} ${svgRoomWidth + 2*margin} ${svgRoomHeight + 2*margin}`;
  };

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
        customSeatPositions: [],
        customLabelPositions: []
      };
    });
    
    setTables(initializedTables);
  }, []);

  // Fonction de rotation bidirectionnelle
  const handleTableRotation = (tableId, direction = "clockwise") => {
    if (!editMode) return;
    
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
    
    // Déterminer le nom de la table dupliquée
    const baseName = tableToClone.label.split(' ')[0] || 'Table';
    
    // Créer la nouvelle table avec un décalage de position
    const newTable = {
      ...clonedTable,
      id: newId,
      label: `${baseName} ${newId}`,
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

  // Fonction pour calculer les positions des sièges autour d'une table
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
      } else if (totalSeats === 14) {
        // Configuration pour les grandes tables rectangulaires (220x90)
        if (seatIndex < 5) {
          // 5 sièges sur le côté long inférieur
          const spacing = tableWidth / 5;
          x = -tableWidth/2 + spacing/2 + seatIndex * spacing;
          y = tableHeight/2 + 15;
        } else if (seatIndex < 10) {
          // 5 sièges sur le côté long supérieur
          const spacing = tableWidth / 5;
          const upperIndex = seatIndex - 5;
          x = -tableWidth/2 + spacing/2 + upperIndex * spacing;
          y = -tableHeight/2 - 15;
        } else if (seatIndex < 12) {
          // 2 sièges en bout de table (à gauche)
          const spacing = tableHeight / 2;
          const leftIndex = seatIndex - 10;
          x = -tableWidth/2 - 15;
          y = -tableHeight/2 + spacing/2 + leftIndex * spacing;
        } else {
          // 2 sièges en bout de table (à droite)
          const spacing = tableHeight / 2;
          const rightIndex = seatIndex - 12;
          x = tableWidth/2 + 15;
          y = -tableHeight/2 + spacing/2 + rightIndex * spacing;
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
  
  // Fonction pour calculer les positions des sièges autour d'une table ovale
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

  // Ajouter un siège à une table
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

  // Supprimer un siège d'une table
  const removeTableSeat = (tableId, seatIndex) => {
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
        setUnassignedGuests(prev => [...prev, { ...guest, tableId: null, seatId: null }]);
        
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
            .filter((_, idx) => idx !== seatIndex);
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

  // Fonction pour créer une nouvelle table à partir d'un template
  const createTableFromTemplate = (templateId, position = { x: svgRoomWidth / 2, y: svgRoomHeight / 2 }) => {
    const template = tableTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    // Générer un ID unique pour la nouvelle table
    const newId = Date.now();
    
    // Créer les sièges
    const seats = Array(template.capacity).fill(null).map((_, index) => ({
      id: `${newId}-${index}`,
      index,
      occupant: null
    }));
    
    // Créer la nouvelle table
    const newTable = {
      id: newId,
      label: `${template.label} ${tables.length + 1}`,
      shape: template.shape,
      width: template.width,
      height: template.height,
      radius: template.radius, // Pour les tables rondes
      capacity: template.capacity,
      realWidth: template.realWidth,
      realHeight: template.realHeight,
      x: position.x,
      y: position.y,
      rotation: 0,
      seats,
      isSelected: true,
      isMoving: false,
      isRotating: false,
      customSeatPositions: [],
      customLabelPositions: []
    };
    
    // Ajouter la table et la sélectionner
    setTables(prevTables => {
      // Désélectionner toutes les autres tables
      const updatedTables = prevTables.map(t => ({
        ...t,
        isSelected: false
      }));
      
      return [...updatedTables, newTable];
    });
    
    setSelectedTable(newId);
    setShowTemplateSelector(false);
  };

  // Fonction pour créer une table rectangulaire personnalisée
  const createCustomRectangleTable = () => {
    const { width, height, capacity } = customTableForm;
    
    // Valider les dimensions et la capacité
    if (width <= 0 || height <= 0 || capacity <= 0) {
      alert("Veuillez saisir des valeurs positives pour les dimensions et la capacité.");
      return;
    }
    
    // Créer une table rectangulaire personnalisée
    const newId = Date.now();
    
    // Créer les sièges
    const seats = Array(capacity).fill(null).map((_, index) => ({
      id: `${newId}-${index}`,
      index,
      occupant: null
    }));
    
    // Créer la nouvelle table
    const newTable = {
      id: newId,
      label: `Table Perso ${tables.length + 1}`,
      shape: "rectangle",
      width: parseFloat(width),
      height: parseFloat(height),
      capacity: parseInt(capacity),
      realWidth: parseFloat(width) * 5,
      realHeight: parseFloat(height) * 5,
      x: svgRoomWidth / 2,
      y: svgRoomHeight / 2,
      rotation: 0,
      seats,
      isSelected: true,
      isMoving: false,
      isRotating: false,
      customSeatPositions: [],
      customLabelPositions: []
    };
    
    // Ajouter la table et la sélectionner
    setTables(prevTables => {
      // Désélectionner toutes les autres tables
      const updatedTables = prevTables.map(t => ({
        ...t,
        isSelected: false
      }));
      
      return [...updatedTables, newTable];
    });
    
    setSelectedTable(newId);
    setShowCustomTableForm(false);
  };

  // Fonction pour créer une nouvelle zone
  const createNewZone = () => {
    // Générer un ID unique pour la nouvelle zone
    const zoneId = `zone-${Date.now()}`;
    
    // Créer la nouvelle zone
    const newZone = {
      id: zoneId,
      label: `Zone ${zones.length + 1}`,
      x: svgRoomWidth / 2,
      y: svgRoomHeight / 2,
      width: 200,
      height: 150,
      isSelected: false,
      isMoving: false
    };
    
    // Ajouter la zone
    setZones(prevZones => [...prevZones, newZone]);
  };

  // Fonction pour supprimer une zone
  const deleteZone = (zoneId) => {
    setZones(prevZones => prevZones.filter(zone => zone.id !== zoneId));
  };

 
  
 
  
  const endMeasure = () => {
    if (!measurePoints) return;
    
    setMeasurePoints({
      ...measurePoints,
      isDragging: false
    });
  };
  
// Fonction transformPointToSVG corrigée pour résoudre le problème de décalage
const transformPointToSVG = (clientX, clientY, zoom, pan) => {
  if (!svgRef.current) return { x: 0, y: 0 };
  
  // Obtenir les dimensions et la position du SVG dans la fenêtre
  const svgRect = svgRef.current.getBoundingClientRect();
  
  // 1. Convertir les coordonnées du client en coordonnées relatives au conteneur SVG
  const relativeX = clientX - svgRect.left;
  const relativeY = clientY - svgRect.top;
  
  // 2. Convertir les coordonnées relatives en coordonnées SVG en tenant compte du zoom
  // (diviser par le zoom pour annuler l'effet du zoom)
  const unzoomedX = relativeX / zoom;
  const unzoomedY = relativeY / zoom;
  
  // 3. Appliquer le pan (décalage) pour obtenir les coordonnées finales
  // Prendre en compte le viewBox qui commence à -100, -100
  // ViewBox actuel: viewBox=`-100 -100 ${svgRoomWidth + 200} ${svgRoomHeight + 200}`
  const viewBoxStartX = 0;
  const viewBoxStartY = 0;
  
  // Calculer les coordonnées finales dans l'espace SVG
  const svgX = unzoomedX - pan.x + viewBoxStartX;
  const svgY = unzoomedY - pan.y + viewBoxStartY;
  
  return { x: svgX, y: svgY };
};

// Mise à jour des fonctions qui utilisent transformPointToSVG
const startMeasure = (e) => {
  if (!showMeasureTool) return;
  
  const point = transformPointToSVG(e.clientX, e.clientY, zoom, pan);
  
  setMeasurePoints({
    start: point,
    end: point,
    isDragging: true
  });
};

const updateMeasure = (e) => {
  if (!measurePoints || !measurePoints.isDragging) return;
  
  const point = transformPointToSVG(e.clientX, e.clientY, zoom, pan);
  
  setMeasurePoints({
    ...measurePoints,
    end: point
  });
};

// Correctement calculer la distance en cm
const calculateDistance = (point1, point2) => {
  if (!point1 || !point2) return 0;
  
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  
  // Distance en unités SVG
  const distanceSVG = Math.sqrt(dx * dx + dy * dy);
  
  // Convertir en cm (1 unité SVG = scaleFactor cm)
  const distanceCm = distanceSVG * scaleFactor;
  
  return distanceCm;
};

// Pour déboguer le décalage, vous pouvez ajouter cette fonction
const debugMousePosition = (e) => {
  if (!svgRef.current) return;
  
  const svgRect = svgRef.current.getBoundingClientRect();
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  
  // Coordonnées relatives au SVG
  const relX = mouseX - svgRect.left;
  const relY = mouseY - svgRect.top;
  
  // Coordonnées transformées
  const svgPoint = transformPointToSVG(mouseX, mouseY, zoom, pan);
  
  console.log('Mouse:', { clientX: mouseX, clientY: mouseY });
  console.log('Relative to SVG:', { x: relX, y: relY });
  console.log('Transformed to SVG space:', svgPoint);
  console.log('Current zoom:', zoom, 'pan:', pan);
};

// Ajouter temporairement un gestionnaire de mouvement pour déboguer
// Vous pouvez ajouter ceci au SVG pour tester
/*
onMouseMove={(e) => {
  handleMouseMove(e);
  doPan(e);
  if (showMeasureTool) {
    updateMeasure(e);
  }
  // Décommenter pour voir les coordonnées dans la console
  // debugMousePosition(e);
}}
*/

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

  // Modifier le nom d'un invité
  const updateGuestName = (guestId, newName) => {
    if (newName.trim() === '') return;
    
    const updatedGuests = guests.map(g => {
      if (g.id === guestId) {
        return { ...g, name: newName.trim() };
      }
      return g;
    });
    
    const updatedUnassignedGuests = unassignedGuests.map(g => {
      if (g.id === guestId) {
        return { ...g, name: newName.trim() };
      }
      return g;
    });
    
    setGuests(updatedGuests);
    setUnassignedGuests(updatedUnassignedGuests);
    setEditingGuest(null);
  };

  // Modifier le nom d'une table
  const updateTableName = (tableId, newName) => {
    if (newName.trim() === '') return;
    
    const updatedTables = tables.map(t => {
      if (t.id === tableId) {
        return { ...t, label: newName.trim() };
      }
      return t;
    });
    
    setTables(updatedTables);
    setEditingTable(null);
  };

  // Modifier le type d'une table existante
  const changeTableType = (tableId) => {
    const { templateId, customWidth, customHeight, customCapacity } = editTableForm;
    const table = tables.find(t => t.id === tableId);
    
    if (!table) return;
    
    // Conserver les invités assignés
    const occupiedSeats = table.seats
      .filter(seat => seat.occupant !== null)
      .map(seat => ({
        index: seat.index,
        guestId: seat.occupant
      }));
    
    let newTable;
    
    if (templateId === 'custom') {
      // Table personnalisée
      if (customWidth <= 0 || customHeight <= 0 || customCapacity <= 0) {
        alert("Veuillez saisir des valeurs positives pour les dimensions et la capacité.");
        return;
      }
      
      newTable = {
        ...table,
        shape: "rectangle",
        width: parseFloat(customWidth),
        height: parseFloat(customHeight),
        capacity: parseInt(customCapacity),
        realWidth: parseFloat(customWidth) * 5,
        realHeight: parseFloat(customHeight) * 5,
        radius: undefined // Supprimer le rayon si c'était une table ronde
      };
    } else {
      // Table basée sur un template
      const template = tableTemplates.find(t => t.id === templateId);
      if (!template) return;
      
      newTable = {
        ...table,
        shape: template.shape,
        width: template.width,
        height: template.height,
        radius: template.radius,
        capacity: template.capacity,
        realWidth: template.realWidth,
        realHeight: template.realHeight
      };
    }
    
    // Créer de nouveaux sièges
    const newSeats = Array(newTable.capacity).fill(null).map((_, index) => ({
      id: `${tableId}-${index}`,
      index,
      occupant: null
    }));
    
    // Réassigner les invités aux nouveaux sièges (autant que possible)
    occupiedSeats.forEach(({ index, guestId }) => {
      if (index < newSeats.length) {
        newSeats[index].occupant = guestId;
        
        // Mettre à jour l'invité
        const guestIndex = guests.findIndex(g => g.id === guestId);
        if (guestIndex >= 0) {
          const updatedGuests = [...guests];
          updatedGuests[guestIndex] = {
            ...updatedGuests[guestIndex],
            tableId: tableId,
            seatId: newSeats[index].id
          };
          setGuests(updatedGuests);
        }
      } else {
        // Si le siège n'existe plus dans la nouvelle table, libérer l'invité
        const guest = guests.find(g => g.id === guestId);
        if (guest) {
          // Mettre à jour l'invité
          const updatedGuests = guests.map(g => {
            if (g.id === guestId) {
              return { ...g, tableId: null, seatId: null };
            }
            return g;
          });
          
          // Ajouter l'invité aux non assignés
          setUnassignedGuests(prev => [...prev, { ...guest, tableId: null, seatId: null }]);
          
          // Mettre à jour la liste des invités
          setGuests(updatedGuests);
        }
      }
    });
    
    // Mettre à jour la table
    const updatedTables = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...newTable,
          seats: newSeats,
          // Réinitialiser les positions personnalisées
          customSeatPositions: [],
          customLabelPositions: []
        };
      }
      return t;
    });
    
    setTables(updatedTables);
    setEditTableForm({
      templateId: '',
      customWidth: 0,
      customHeight: 0,
      customCapacity: 0
    });
    setEditingTable(null);
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

  // Sélectionner une table
  const selectTable = (tableId) => {
    if (!editMode) return;
    
    const updatedTables = tables.map(table => ({
      ...table,
      isSelected: table.id === tableId
    }));
    
    setTables(updatedTables);
    setSelectedTable(tableId);
  };

  // Démarrer le déplacement d'une table
  const startMovingTable = (e, tableId) => {
    if (!editMode) return;
    e.stopPropagation();
    e.preventDefault();
    
    const updatedTables = tables.map(table => ({
      ...table,
      isMoving: table.id === tableId,
      isSelected: table.id === tableId,
      isRotating: false
    }));
    
    setTables(updatedTables);
    setSelectedTable(tableId);
    
    // Enregistrer la position initiale
    const { clientX, clientY } = e;
    setDragStart({ x: clientX, y: clientY });
    setIsDragging(true);
  };

  // Démarrer le déplacement d'une zone
  const startMovingZone = (e, zoneId) => {
    if (!editMode) return;
    e.stopPropagation();
    e.preventDefault();
    
    const updatedZones = zones.map(zone => ({
      ...zone,
      isMoving: zone.id === zoneId,
      isSelected: zone.id === zoneId
    }));
    
    setZones(updatedZones);
    
    // Enregistrer la position initiale
    const { clientX, clientY } = e;
    setDragStart({ x: clientX, y: clientY });
    setIsDragging(true);
  };

  // Gérer le déplacement de la souris pour déplacer les tables/zones
  const handleMouseMove = (e) => {
    if (!isDragging || !editMode) return;
    
    const { clientX, clientY } = e;
    const dx = (clientX - dragStart.x) / zoom;
    const dy = (clientY - dragStart.y) / zoom;
    
    // Déplacer les tables
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
    
    // Déplacer les zones
    const updatedZones = zones.map(zone => {
      if (zone.isMoving) {
        return {
          ...zone,
          x: zone.x + dx,
          y: zone.y + dy
        };
      }
      return zone;
    });
    
    setTables(updatedTables);
    setZones(updatedZones);
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
    
    const updatedZones = zones.map(zone => ({
      ...zone,
      isMoving: false
    }));
    
    setTables(updatedTables);
    setZones(updatedZones);
    setIsDragging(false);
  };

  // Démarrer la rotation d'une table
  const startRotatingTable = (e, tableId) => {
    if (!editMode) return;
    e.stopPropagation();
    e.preventDefault();
    
    // Trouver la table à pivoter
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    // Incrémenter la rotation de 15 degrés à chaque clic
    const newRotation = (Math.round(table.rotation / 15) * 15 + 15) % 360;
    
    const updatedTables = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          rotation: newRotation,
          isSelected: true,
          isMoving: false
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

  // Réinitialiser la vue (zoom et pan)
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  

// Fonction pour le rendu de la grille
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

// Composant pour les contrôles de grille
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

// Composant pour afficher les informations d'une table au survol
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
        {editingTable === table.id ? (
          <div className="flex flex-grow mr-2">
            <input
              type="text"
              value={newTableName || table.label}
              onChange={(e) => setNewTableName(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 flex-grow"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateTableName(table.id, newTableName);
                setNewTableName('');
              }}
              className="bg-green-500 text-white px-2 py-1 rounded ml-2"
            >
              ✓
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingTable(null);
                setNewTableName('');
              }}
              className="bg-gray-500 text-white px-2 py-1 rounded ml-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            <h3 className="font-bold">{table.label}</h3>
            <button
              onClick={() => {
                setEditingTable(table.id);
                setNewTableName(table.label);
              }}
              className="ml-2 text-blue-500 hover:bg-blue-100 p-1 rounded text-sm"
              title="Modifier le nom de la table"
            >
              ✎
            </button>
          </div>
        )}
        <span className="bg-gray-100 px-2 py-1 rounded text-sm">
          {stats.occupied}/{stats.total}
        </span>
      </div>
      
      {/* Bouton pour modifier le type de table */}
      <div className="mb-2">
        <button 
          onClick={() => {
            setEditingTable(table.id);
            setEditTableForm({
              templateId: 'custom',
              customWidth: table.width,
              customHeight: table.height,
              customCapacity: table.capacity
            });
            setShowTableTypeModal(true);  // Cette variable d'état devra être ajoutée
          }}
          className="text-sm bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
        >
          Modifier le type ({table.shape}, {table.width}x{table.height})
        </button>
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
              {editingGuest === guest.id ? (
                <div className="flex flex-grow">
                  <input
                    type="text"
                    value={newGuestName || guest.name}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 flex-grow"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateGuestName(guest.id, newGuestName);
                      setNewGuestName('');
                    }}
                    className="bg-green-500 text-white px-2 py-1 rounded ml-2"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <div className="flex items-center flex-grow">
                  <span>{guest.name}</span>
                  <button
                    onClick={() => {
                      setEditingGuest(guest.id);
                      setNewGuestName(guest.name);
                    }}
                    className="ml-2 text-blue-500 hover:bg-blue-100 p-1 rounded text-xs"
                    title="Modifier le nom"
                  >
                    ✎
                  </button>
                </div>
              )}
              <button
                onClick={() => removeGuestFromSeat(guest.id)}
                className="text-red-500 p-1 rounded hover:bg-red-100 ml-1"
                title="Retirer de la table"
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

// Fonction pour l'export en PNG (à implémenter)
const exportAsPNG = () => {
  // Obtenir le SVG
  const svgElement = document.querySelector('svg');
  if (!svgElement) {
    alert('Erreur: SVG non trouvé');
    return;
  }
  
  // Code pour exporter en PNG...
  alert('Export en PNG non implémenté');
};

// Fonction pour supprimer une table
const deleteTable = (tableId) => {
  // Libérer les invités assis à cette table
  const tableToDelete = tables.find(t => t.id === tableId);
  if (!tableToDelete) return;
  
  // Récupérer les invités assis à cette table
  const guestsAtTable = [];
  tableToDelete.seats.forEach(seat => {
    if (seat.occupant) {
      const guest = guests.find(g => g.id === seat.occupant);
      if (guest) {
        guestsAtTable.push(guest);
      }
    }
  });
  
  // Mettre à jour les invités
  const updatedGuests = guests.map(guest => {
    if (guest.tableId === tableId) {
      return { ...guest, tableId: null, seatId: null };
    }
    return guest;
  });
  
  // Ajouter les invités aux non assignés
  setUnassignedGuests([...unassignedGuests, ...guestsAtTable]);
  
  // Mettre à jour la liste des invités
  setGuests(updatedGuests);
  
  // Supprimer la table
  setTables(tables.filter(t => t.id !== tableId));
  
  // Désélectionner la table
  if (selectedTable === tableId) {
    setSelectedTable(null);
  }
};


// 1. Fonction getTableStats - À ajouter dans le composant WeddingSeatingApp
const getTableStats = (table) => {
  if (!table || !table.seats) return { total: 0, occupied: 0, remaining: 0 };
  
  const total = table.seats.length;
  const occupied = table.seats.filter(seat => seat.occupant !== null).length;
  const remaining = total - occupied;
  
  return { total, occupied, remaining };
};

// 2. Fonction pour calculer les statistiques globales - À ajouter
const calculateTotalStats = () => {
  let total = 0;
  let occupied = 0;
  
  tables.forEach(table => {
    const stats = getTableStats(table);
    total += stats.total;
    occupied += stats.occupied;
  });
  
  return {
    total,
    occupied,
    remaining: total - occupied
  };
};

// 3. Propriété totalStats - À ajouter comme une variable calculée
// Ajoutez cette ligne dans votre composant, juste avant le return
const totalStats = calculateTotalStats();

// 4. Fonction exportConfig - Pour exporter la configuration
const exportConfig = () => {
  // Créer un objet avec toute la configuration
  const configData = {
    tables,
    guests,
    roomDimensions,
    zones
  };
  
  // Convertir en JSON
  const jsonData = JSON.stringify(configData, null, 2);
  
  // Créer un objet Blob pour le téléchargement
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Créer un lien de téléchargement et le déclencher
  const link = document.createElement('a');
  link.href = url;
  link.download = `wedding-seating-plan-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  
  // Nettoyer
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
};

// 5. Fonction importConfig - Pour importer une configuration
// Fonction importConfig améliorée - compatible avec l'ancien format
const importConfig = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result);
      
      // Vérifier que le fichier contient au moins les tables
      if (!config.tables) {
        alert("Format de fichier invalide : tables manquantes");
        return;
      }
      
      // Tableau pour stocker tous les invités
      const allGuests = [];
      let guestIdCounter = Date.now();
      
      // Traiter les tables et éventuellement convertir les invités
      const processedTables = config.tables.map(table => {
        // Créer une copie de la table
        const newTable = { ...table };
        
        // Créer le tableau de sièges s'il n'existe pas
        if (!newTable.seats) {
          // Créer un tableau de places pour chaque table
          const seatCount = newTable.capacity || 0;
          newTable.seats = Array(seatCount).fill(null).map((_, index) => ({
            id: `${table.id}-${index}`,
            index,
            occupant: null
          }));
        }
        
        // Si la table contient des invités dans l'ancien format, les convertir
        if (Array.isArray(newTable.guests)) {
          newTable.guests.forEach((guest, index) => {
            if (index < newTable.seats.length) {
              // Créer un ID unique pour l'invité
              const guestId = `guest-${guestIdCounter++}`;
              
              // Ajouter l'invité au tableau global
              allGuests.push({
                id: guestId,
                name: guest.name,
                tableId: newTable.id,
                seatId: newTable.seats[index].id
              });
              
              // Assigner l'invité au siège
              newTable.seats[index].occupant = guestId;
            }
          });
          
          // Supprimer la propriété guests obsolète
          delete newTable.guests;
        }
        
        return newTable;
      });
      
      // Traiter les invités non assignés si présents
      if (Array.isArray(config.unassigned)) {
        config.unassigned.forEach(name => {
          const guestId = `guest-${guestIdCounter++}`;
          allGuests.push({
            id: guestId,
            name: name,
            tableId: null,
            seatId: null
          });
        });
      }
      
      // Mettre à jour les états
      setTables(processedTables);
      
      // Si le fichier contient déjà des invités dans le nouveau format
      if (Array.isArray(config.guests) && config.guests.length > 0 && config.guests[0].id) {
        setGuests(config.guests);
        // Filtrer les invités non assignés
        const unassigned = config.guests.filter(guest => !guest.tableId);
        setUnassignedGuests(unassigned);
      } else {
        // Utiliser les invités convertis
        setGuests(allGuests);
        // Filtrer les invités non assignés
        const unassigned = allGuests.filter(guest => !guest.tableId);
        setUnassignedGuests(unassigned);
      }
      
      // Appliquer les dimensions de la salle si disponibles
      if (config.roomDimensions) {
        setRoomDimensions(config.roomDimensions);
        setRoomSettingsForm({
          width: config.roomDimensions.width / 100,
          height: config.roomDimensions.height / 100
        });
      }
      
      // Appliquer les zones si disponibles
      if (config.zones) {
        setZones(config.zones);
      }
      
      alert("Configuration importée avec succès");
    } catch (error) {
      console.error("Erreur lors de l'importation:", error);
      alert("Erreur lors de l'importation du fichier: " + error.message);
    }
  };
  
  reader.readAsText(file);
};

// 6. Fonction handleWheel - Pour gérer le zoom avec la molette
const handleWheel = (e) => {
  if (!showMap) return;
  
  e.preventDefault();
  
  // Ajuster le facteur de zoom (plus petit pour un zoom plus progressif)
  const zoomFactor = 0.1;
  const delta = e.deltaY < 0 ? 1 + zoomFactor : 1 - zoomFactor;
  
  // Limiter le zoom entre 0.2 et 5
  const newZoom = Math.min(Math.max(zoom * delta, 0.2), 5);
  
  setZoom(newZoom);
};

// 7. Fonction handleSeatDrag - Pour gérer le déplacement des sièges
const handleSeatDrag = (e, tableId, seatIndex) => {
  if (!editMode) return;
  e.stopPropagation();
  e.preventDefault();
  
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  
  // Position initiale du siège
  const seatPos = calculateSeatPositions(table, seatIndex);
  
  // Obtenir les coordonnées SVG du point de départ
  const svgRect = svgRef.current.getBoundingClientRect();
  const startPoint = {
    x: (e.clientX - svgRect.left) / zoom - pan.x - table.x,
    y: (e.clientY - svgRect.top) / zoom - pan.y - table.y
  };
  
  // Calculer l'offset initial (relatif à la table, avant rotation)
  const angleRad = -table.rotation * (Math.PI / 180);
  const initialOffsetX = (seatPos.x - table.x) * Math.cos(angleRad) - 
                         (seatPos.y - table.y) * Math.sin(angleRad);
  const initialOffsetY = (seatPos.x - table.x) * Math.sin(angleRad) + 
                         (seatPos.y - table.y) * Math.cos(angleRad);
  
  // Set l'état pour le siège actif
  setActiveSeat({
    tableId,
    seatIndex,
    position: {
      x: initialOffsetX,
      y: initialOffsetY
    }
  });
  
  // Fonction pour le mouvement de la souris
  const handleMove = (moveEvent) => {
    // Calculer les nouvelles coordonnées relatives à la table
    const newPoint = {
      x: (moveEvent.clientX - svgRect.left) / zoom - pan.x - table.x,
      y: (moveEvent.clientY - svgRect.top) / zoom - pan.y - table.y
    };
    
    // Convertir en coordonnées relatives à la table, en prenant en compte la rotation
    const angleRad = -table.rotation * (Math.PI / 180);
    const rotatedX = newPoint.x * Math.cos(angleRad) - newPoint.y * Math.sin(angleRad);
    const rotatedY = newPoint.x * Math.sin(angleRad) + newPoint.y * Math.cos(angleRad);
    
    // Mettre à jour la position active
    setActiveSeat({
      tableId,
      seatIndex,
      position: {
        x: rotatedX,
        y: rotatedY
      }
    });
  };
  
  // Fonction pour terminer le déplacement
  const handleUp = (upEvent) => {
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleUp);
    
    // Calculer la position finale
    const finalPoint = {
      x: (upEvent.clientX - svgRect.left) / zoom - pan.x - table.x,
      y: (upEvent.clientY - svgRect.top) / zoom - pan.y - table.y
    };
    
    // Convertir en coordonnées relatives à la table
    const angleRad = -table.rotation * (Math.PI / 180);
    const rotatedX = finalPoint.x * Math.cos(angleRad) - finalPoint.y * Math.sin(angleRad);
    const rotatedY = finalPoint.x * Math.sin(angleRad) + finalPoint.y * Math.cos(angleRad);
    
    // Mettre à jour la position personnalisée du siège
    setTables(prevTables => {
      return prevTables.map(t => {
        if (t.id !== tableId) return t;
        
        // Créer ou mettre à jour le tableau de positions personnalisées
        const customPositions = [...(t.customSeatPositions || [])];
        
        // S'assurer que le tableau a la bonne taille
        while (customPositions.length <= seatIndex) {
          customPositions.push({ x: 0, y: 0 });
        }
        
        // Mettre à jour la position
        customPositions[seatIndex] = { x: rotatedX, y: rotatedY };
        
        return {
          ...t,
          customSeatPositions: customPositions
        };
      });
    });
    
    // Nettoyer l'état actif
    setActiveSeat(null);
  };
  
  // Ajouter les écouteurs d'événements
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleUp);
};









// Rendu de l'application
return (
  <div className="flex flex-col h-full bg-gray-100 p-4">
    <h1 className="text-2xl font-bold mb-4 text-center">Planificateur de Places de Mariage</h1>
    
    <div className="flex flex-wrap gap-4">
      {/* Panneau de gauche - Contrôles */}
      <div className="w-full md:w-1/3 bg-white rounded-lg p-4 shadow">
        <h2 className="text-xl font-bold mb-4">Invités et Contrôles</h2>

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
          
          <div className="flex flex-wrap gap-2 mb-2">
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
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="flex-1 bg-green-500 text-white p-2 rounded"
            >
              Ajouter une table
            </button>
            
            <button
              onClick={() => setShowCustomTableForm(true)}
              className="flex-1 bg-purple-500 text-white p-2 rounded"
            >
              Table personnalisée
            </button>
            
            <button
              onClick={createNewZone}
              className="flex-1 bg-indigo-500 text-white p-2 rounded"
            >
              Ajouter une zone
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
            <p>Échelle: 1 unité = {scaleFactor}cm</p>
          </div>
        </div>
        
        {/* Gestion des sièges */}
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
        <div className="flex mb-4 mt-4">
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
              
              {/* Outil de mesure */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMeasureTool(!showMeasureTool)}
                  className={`flex-1 p-2 rounded ${showMeasureTool ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  {showMeasureTool ? 'Désactiver mesure' : 'Outil de mesure'}
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
                    {editingGuest === guest.id ? (
                      <div className="flex flex-grow">
                        <input
                          type="text"
                          value={newGuestName || guest.name}
                          onChange={(e) => setNewGuestName(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 flex-grow"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateGuestName(guest.id, newGuestName);
                            setNewGuestName('');
                          }}
                          className="bg-green-500 text-white px-2 py-1 rounded ml-2"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{guest.name}</span>
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGuest(guest.id);
                              setNewGuestName(guest.name);
                            }}
                            className="text-blue-500 p-1 rounded hover:bg-blue-100 mr-1"
                          >
                            ✎
                          </button>
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
                      </>
                    )}
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
            onMouseDown={(e) => {
              if (showMeasureTool) {
                startMeasure(e);
              } else {
                startPan(e);
              }
            }}
            onMouseMove={(e) => {
              handleMouseMove(e);
              doPan(e);
              if (showMeasureTool) {
                updateMeasure(e);
              }
            }}
            onMouseUp={() => {
              handleMouseUp();
              if (showMeasureTool) {
                endMeasure();
              }
            }}
            onMouseLeave={() => {
              handleMouseUp();
              if (showMeasureTool) {
                endMeasure();
              }
            }}
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
            
            {/* Panneau de contrôle des tables */}
            {editMode && selectedTable && (
              <div className="absolute top-4 right-4 z-50 bg-white p-3 rounded shadow border border-gray-300">
                <h3 className="font-bold mb-2">
                  Table {tables.find(t => t.id === selectedTable)?.label}
                </h3>
                
                <div className="flex gap-2">
                  <button
                    className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm"
                    onClick={() => handleTableRotation(selectedTable, "counterclockwise")}
                  >
                    ↺ Rotation G
                  </button>
                  
                  <button
                    className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm"
                    onClick={() => handleTableRotation(selectedTable, "clockwise")}
                  >
                    ↻ Rotation D
                  </button>
                  
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                    onClick={() => duplicateTable(selectedTable)}
                  >
                    + Dupliquer
                  </button>
                </div>
              </div>
            )}
            
            <svg 
              viewBox={`-100 -100 ${svgRoomWidth + 200} ${svgRoomHeight + 200}`}
              style={{ 
                width: '100%', 
                height: '100%',
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                cursor: showMeasureTool 
                  ? 'crosshair' 
                  : (isDragging 
                    ? 'grabbing' 
                    : (panEnabled ? 'move' : 'default'))
              }}
              onMouseMove={(e) => {
                handleMouseMove(e);
                doPan(e);
                if (showMeasureTool) {
                  updateMeasure(e);
                }
              }}
              onMouseUp={() => {
                handleMouseUp();
                if (showMeasureTool) {
                  endMeasure();
                }
              }}
              onMouseLeave={() => {
                handleMouseUp();
                if (showMeasureTool) {
                  endMeasure();
                }
              }}
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
                
                {/* Zones */}
                {zones.map(zone => {
                  const isZoneSelected = zone.isSelected;
                  
                  return (
                    <g key={`zone-${zone.id}`}>
                      <rect
                        x={zone.x - zone.width/2}
                        y={zone.y - zone.height/2}
                        width={zone.width}
                        height={zone.height}
                        fill="rgba(144, 202, 249, 0.2)"
                        stroke={isZoneSelected ? "#2196f3" : "#90caf9"}
                        strokeWidth={isZoneSelected ? "2" : "1"}
                        strokeDasharray="5,5"
                        onClick={() => {
                          if (editMode) {
                            const updatedZones = zones.map(z => ({
                              ...z,
                              isSelected: z.id === zone.id
                            }));
                            setZones(updatedZones);
                          }
                        }}
                        onMouseDown={(e) => {
                          if (editMode) {
                            startMovingZone(e, zone.id);
                          }
                        }}
                        style={{ cursor: editMode ? 'move' : 'default' }}
                      />
                      
                      <text
                        x={zone.x}
                        y={zone.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1976d2"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        {zone.label}
                      </text>
                      
                      {editMode && isZoneSelected && (
                        <g>
                          <circle
                            cx={zone.x + zone.width/2 + 10}
                            cy={zone.y - zone.height/2}
                            r="8"
                            fill="#f44336"
                            stroke="#fff"
                            strokeWidth="1"
                            onClick={() => deleteZone(zone.id)}
                            style={{ cursor: 'pointer' }}
                            data-control="true"
                          />
                          <text
                            x={zone.x + zone.width/2 + 10}
                            y={zone.y - zone.height/2 + 1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#fff"
                            fontSize="10"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                            data-control="true"
                          >
                            ✕
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
                
                {/* Tables */}
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
                        fill="#000" 
                        fontSize="16" 
                        fontWeight="bold"
                        pointerEvents="none"
                        style={{ userSelect: 'none' }}
                      >
                        {table.label || `Table ${table.id}`}
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
                        <g data-control="true">
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
                          data-control="true"
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
                    
                    // Gérer le déplacement des étiquettes
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
                    
                    return (
                      <g key={`seat-${seat.id}`}>
                        {/* Bouton de suppression de siège */}
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
                            data-control="true"
                          />
                        )}
                        
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
                        
                        {/* Étiquette avec fond */}
                        {isOccupied && guest && showLabels && (
                          <>
                            {/* Lien entre le siège et l'étiquette */}
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
                          </>
                        )}
                      </g>
                    );
                  })
                )}
                
                {/* Outil de mesure */}
                {measurePoints && (
                  <g>
                    <line
                      x1={measurePoints.start.x}
                      y1={measurePoints.start.y}
                      x2={measurePoints.end.x}
                      y2={measurePoints.end.y}
                      stroke="#2196f3"
                      strokeWidth="2"
                      strokeDasharray="5,3"
                    />
                    <circle
                      cx={measurePoints.start.x}
                      cy={measurePoints.start.y}
                      r="4"
                      fill="#2196f3"
                    />
                    <circle
                      cx={measurePoints.end.x}
                      cy={measurePoints.end.y}
                      r="4"
                      fill="#2196f3"
                    />
                    
                    {/* Afficher la distance */}
                    {!measurePoints.isDragging && (
                      <>
                        <rect
                          x={(measurePoints.start.x + measurePoints.end.x) / 2 - 30}
                          y={(measurePoints.start.y + measurePoints.end.y) / 2 - 10}
                          width="60"
                          height="20"
                          fill="white"
                          stroke="#2196f3"
                          strokeWidth="1"
                          rx="4"
                          ry="4"
                        />
                        <text
                          x={(measurePoints.start.x + measurePoints.end.x) / 2}
                          y={(measurePoints.start.y + measurePoints.end.y) / 2 + 5}
                          textAnchor="middle"
                          fill="#2196f3"
                          fontSize="12"
                          fontWeight="bold"
                        >
                          {calculateDistance(measurePoints.start, measurePoints.end).toFixed(1)} cm
                        </text>
                      </>
                    )}
                  </g>
                )}
              </g>
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map(table => (
              <div 
                key={table.id} 
                className="border border-gray-300 rounded p-3"
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
          <li>Cliquez sur le point rouge pour faire pivoter la table de 15°</li>
          <li>Utilisez les boutons de rotation dans le panneau pour des rotations précises</li>
          <li>Utilisez le bouton "Dupliquer" pour créer une copie de la table sélectionnée</li>
          <li>Quand une table est sélectionnée, vous pouvez déplacer ses sièges individuellement</li>
          <li>Vous pouvez également déplacer les étiquettes des noms pour mieux les organiser</li>
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
          <li>Utilisez l'outil de mesure pour vérifier les distances entre les éléments</li>
          <li>Utilisez les zones pour organiser des groupes de tables ou délimiter des espaces</li>
          <li>Vous pouvez changer le type d'une table existante via la vue liste</li>
          <li>N'oubliez pas d'exporter votre configuration pour la sauvegarder</li>
        </ol>
      )}
    </div>
    
    {/* Modal pour le sélecteur de template de table */}
    {showTemplateSelector && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="font-bold text-xl mb-4">Sélectionner un modèle de table</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {tableTemplates.map(template => (
              <div
                key={template.id}
                className="border border-gray-300 rounded p-3 cursor-pointer hover:bg-blue-50"
                onClick={() => createTableFromTemplate(template.id)}
              >
                <div className="font-bold">{template.label}</div>
                <div className="text-sm">
                  {template.shape === 'rectangle' && 'Rectangle'}
                  {template.shape === 'round' && 'Rond'}
                  {template.shape === 'oval' && 'Ovale'}
                  {' - '}
                  {template.capacity} places
                </div>
                <div className="text-xs text-gray-500">
                  {template.realWidth/100}m x {template.realHeight/100}m
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={() => setShowTemplateSelector(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}

{showTableTypeModal && editingTable && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="font-bold text-xl mb-4">Modifier le type de table</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Type de table</label>
        <select
          value={editTableForm.templateId}
          onChange={(e) => setEditTableForm({
            ...editTableForm,
            templateId: e.target.value
          })}
          className="w-full border border-gray-300 rounded p-2"
        >
          <option value="">Sélectionner un modèle</option>
          {tableTemplates.map(template => (
            <option key={template.id} value={template.id}>
              {template.label} ({template.capacity} places)
            </option>
          ))}
          <option value="custom">Personnalisée</option>
        </select>
      </div>
      
      {editTableForm.templateId === 'custom' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Largeur (unités SVG)</label>
            <input
              type="number"
              min="10"
              max="500"
              value={editTableForm.customWidth}
              onChange={(e) => setEditTableForm({
                ...editTableForm,
                customWidth: parseFloat(e.target.value)
              })}
              className="w-full border border-gray-300 rounded p-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              {(editTableForm.customWidth * scaleFactor / 100).toFixed(2)} mètres
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Hauteur (unités SVG)</label>
            <input
              type="number"
              min="10"
              max="500"
              value={editTableForm.customHeight}
              onChange={(e) => setEditTableForm({
                ...editTableForm,
                customHeight: parseFloat(e.target.value)
              })}
              className="w-full border border-gray-300 rounded p-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              {(editTableForm.customHeight * scaleFactor / 100).toFixed(2)} mètres
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Capacité (sièges)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={editTableForm.customCapacity}
              onChange={(e) => setEditTableForm({
                ...editTableForm,
                customCapacity: parseInt(e.target.value)
              })}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>
        </>
      )}
      
      <div className="flex justify-end gap-2">
        <button 
          onClick={() => setShowTableTypeModal(false)}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Annuler
        </button>
        <button 
          onClick={() => {
            changeTableType(editingTable);
            setShowTableTypeModal(false);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Appliquer
        </button>
      </div>
    </div>
  </div>
)}
    
    {/* Modal pour la configuration de la salle */}
    {showRoomSettings && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="font-bold text-xl mb-4">Configuration de la salle</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Largeur (mètres)</label>
            <input
              type="number"
              min="1"
              max="50"
              step="0.5"
              value={roomSettingsForm.width}
              onChange={(e) => setRoomSettingsForm({
                ...roomSettingsForm, 
                width: parseFloat(e.target.value)
              })}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Hauteur (mètres)</label>
            <input
              type="number"
              min="1"
              max="50"
              step="0.5"
              value={roomSettingsForm.height}
              onChange={(e) => setRoomSettingsForm({
                ...roomSettingsForm, 
                height: parseFloat(e.target.value)
              })}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setShowRoomSettings(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Annuler
            </button>
            <button 
              onClick={() => {
                if (roomSettingsForm.width > 0 && roomSettingsForm.height > 0) {
                  setRoomDimensions({
                    width: roomSettingsForm.width * 100, // Convertir en cm
                    height: roomSettingsForm.height * 100
                  });
                  setShowRoomSettings(false);
                }
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Modal pour la création d'une table personnalisée */}
    {showCustomTableForm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="font-bold text-xl mb-4">Créer une table personnalisée</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Largeur (unités SVG)</label>
            <input
              type="number"
              min="10"
              max="500"
              value={customTableForm.width}
              onChange={(e) => setCustomTableForm({
                ...customTableForm, 
                width: parseFloat(e.target.value)
              })}
              className="w-full border border-gray-300 rounded p-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              {(customTableForm.width * scaleFactor / 100).toFixed(2)} mètres
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Hauteur (unités SVG)</label>
            <input
              type="number"
              min="10"
              max="500"
              value={customTableForm.height}
              onChange={(e) => setCustomTableForm({
                ...customTableForm, 
                height: parseFloat(e.target.value)
              })}
              className="w-full border border-gray-300 rounded p-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              {(customTableForm.height * scaleFactor / 100).toFixed(2)} mètres
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Capacité (nombre de sièges)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={customTableForm.capacity}
              onChange={(e) => setCustomTableForm({
                ...customTableForm, 
                capacity: parseInt(e.target.value)
              })}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setShowCustomTableForm(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Annuler
            </button>
            <button 
              onClick={createCustomRectangleTable}
              className="bg-purple-500 text-white px-4 py-2 rounded"
            >
              Créer la table
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

export default WeddingSeatingApp;  