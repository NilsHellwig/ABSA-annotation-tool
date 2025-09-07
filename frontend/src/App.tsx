import React, { useState, useEffect } from "react";
import { getAnnotationColorClasses, createTextHighlights, renderHighlightedText } from "./phraseColoring";
import { AspectItem, NewAspect, FieldType, TextPosition, Settings } from "./types";
import { useDarkMode } from "./hooks/useDarkMode";
import { DarkModeToggle } from "./components/DarkModeToggle";
import { CustomCheckbox } from "./components/CustomCheckbox";

function App() {
  const { theme, toggleTheme, isDark } = useDarkMode();

  const [displayedText, setDisplayedText] = useState<string>("");
  const [displayedTranslation, setDisplayedTranslation] = useState<string>("");
  const [consideredSentimentElements, setConsideredSentimentElements] = useState<string[]>([]);
  const [newAspect, setNewAspect] = useState<NewAspect>({
    "aspect_term": "",
    "aspect_category": "",
    "sentiment_polarity": "",
    "opinion_term": ""
  });
  const [aspectList, setAspectList] = useState<AspectItem[]>([]);

  // Popup states
  const [showPhrasePopup, setShowPhrasePopup] = useState<boolean>(false);
  const [currentEditingField, setCurrentEditingField] = useState<FieldType | null>(null);
  const [selectedStartChar, setSelectedStartChar] = useState<number | null>(null);
  const [selectedEndChar, setSelectedEndChar] = useState<number | null>(null);
  const [aspectStartChar, setAspectStartChar] = useState<number | null>(null);
  const [aspectEndChar, setAspectEndChar] = useState<number | null>(null);
  const [opinionStartChar, setOpinionStartChar] = useState<number | null>(null);
  const [opinionEndChar, setOpinionEndChar] = useState<number | null>(null);
  const [isImplicitAspect, setIsImplicitAspect] = useState<boolean>(false);
  const [isImplicitOpinion, setIsImplicitOpinion] = useState<boolean>(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number | null>(null); // For editing existing items

  const [validAspectCategories, setValidAspectCategories] = useState<string[]>([]);
  const [validSentimentPolarities, setValidSentimentPolarities] = useState<string[]>([]);
  const [allowImplicitAspectTerm, setAllowImplicitAspectTerm] = useState<boolean>(false);
  const [allowImplicitOpinionTerm, setAllowImplicitOpinionTerm] = useState<boolean>(false);
  const [autoCleanPhrases, setAutoCleanPhrases] = useState<boolean>(true);
  const [savePhrasePositions, setSavePhrasePositions] = useState<boolean>(true);
  const [clickOnToken, setClickOnToken] = useState<boolean>(true);
  const [enablePrePrediction, setEnablePrePrediction] = useState<boolean>(false);
  const [isAIPredicting, setIsAIPredicting] = useState<boolean>(false);

  // Backend states
  const [currentIndex, setCurrentIndex] = useState<number>(0); // Currently displayed index in UI
  const [settingsCurrentIndex, setSettingsCurrentIndex] = useState<number>(0); // Current index from backend settings
  const [maxIndex, setMaxIndex] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [inputIndex, setInputIndex] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Timing-Feature: Einfache Zeitmessung
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [lastLoadedAnnotations, setLastLoadedAnnotations] = useState<any>(null);
  const [storeTime, setStoreTime] = useState<boolean>(false);
  const [showAvgAnnotationTime, setShowAvgAnnotationTime] = useState<boolean>(false);
  const [avgAnnotationTime, setAvgAnnotationTime] = useState<number>(0);

  // Get backend URL from environment or use default
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000';

  // Function to mix colors mathematically
  // Helper functions

  // Reset timer (bei Navigation)
  const resetTimer = () => {
    setStartTime(Date.now());
  };

  // Duration berechnen
  const getCurrentDuration = (): number => {
    return (Date.now() - startTime) / 1000;
  };

  // Timing speichern
  const saveTiming = async (duration: number, change: boolean) => {
    if (!storeTime) return;
    try {
      await fetch(`${backendUrl}/timing/${currentIndex}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration, change }),
      });
    } catch (e) {
      // Fehler ignorieren
    }
  };

  // Hilfsfunktion: Deep-Compare für Annotationen
  const annotationsChanged = (oldAnn: any, newAnn: any): boolean => {
    return JSON.stringify(oldAnn || []) !== JSON.stringify(newAnn || []);
  };

  // Helper functions
  const truncateText = (text: string, maxLength: number = 20): string => {
    if (!text) return text;
    const trimmedText = text.trim();
    if (trimmedText.length <= maxLength) return trimmedText;
    return trimmedText.substring(0, maxLength) + "...";
  };

  const getTokenBounds = (text: string, charIndex: number): { start: number; end: number } => {
    if (!text || charIndex < 0 || charIndex >= text.length) return { start: charIndex, end: charIndex };

    // Define token boundaries (whitespace and punctuation)
    const isTokenBoundary = (char: string): boolean => /[\s.,;:!?¡¿"'`´''""„«»()[\]{}]+/.test(char);

    let start = charIndex;
    let end = charIndex;

    // Find start of token (go backwards until boundary or start of text)
    while (start > 0 && !isTokenBoundary(text[start - 1])) {
      start--;
    }

    // Find end of token (go forwards until boundary or end of text)
    while (end < text.length - 1 && !isTokenBoundary(text[end + 1])) {
      end++;
    }

    return { start, end };
  };

  const cleanPhrase = (phrase: string): string => {
    if (!phrase || !autoCleanPhrases) return phrase.trim ? phrase.trim() : phrase;
    // First trim whitespace
    let cleaned = phrase.trim();
    // Then remove common punctuation from start and end
    const punctuation = /^[.,;:!?¡¿"'`´''""„«»()[\]{}]+|[.,;:!?¡¿"'`´''""„«»()[\]{}]+$/g;
    cleaned = cleaned.replace(punctuation, '');
    // Trim again in case there were spaces after punctuation
    return cleaned.trim();
  };

  const getCleanedPhrasePositions = (originalStart: number, originalEnd: number, originalText: string): { start: number; end: number } => {
    if (!autoCleanPhrases || originalStart === null || originalEnd === null) {
      return { start: originalStart, end: originalEnd };
    }

    const originalPhrase = originalText.substring(originalStart, originalEnd + 1);
    const cleanedPhrase = cleanPhrase(originalPhrase);

    // If cleaning didn't change anything, return original positions
    if (cleanedPhrase === originalPhrase) {
      return { start: originalStart, end: originalEnd };
    }

    // Find where the cleaned phrase starts and ends within the original phrase
    const cleanedIndex = originalPhrase.indexOf(cleanedPhrase);
    if (cleanedIndex === -1) {
      // Fallback: if cleaned phrase not found, return original positions
      return { start: originalStart, end: originalEnd };
    }

    return {
      start: originalStart + cleanedIndex,
      end: originalStart + cleanedIndex + cleanedPhrase.length - 1
    };
  };

  // Helper functions for character highlighting in popup
  const getAspectCharClass = (index: number): string => {
    let classes = 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 text-gray-900 dark:text-gray-100';

    // Check if we have a selection and phrase cleaning is enabled
    if (aspectStartChar !== null && aspectEndChar !== null && autoCleanPhrases) {
      const cleanedPositions = getCleanedPhrasePositions(aspectStartChar, aspectEndChar, displayedText);
      // If cleaned phrase is different, only show the cleaned version
      if (cleanedPositions.start !== aspectStartChar || cleanedPositions.end !== aspectEndChar) {
        if (index >= cleanedPositions.start && index <= cleanedPositions.end) {
          classes += ' bg-blue-300 dark:bg-blue-600 text-black dark:text-white';
        }
        return classes; // Return early, don't show original selection or markers
      }
    }

    // Fallback: show original selection with markers (when cleaning disabled or no difference)
    if (aspectStartChar !== null && aspectEndChar !== null &&
      index >= aspectStartChar && index <= aspectEndChar) {
      classes += ' bg-blue-300 dark:bg-blue-600 text-black dark:text-white';
    }

    // Start/end markers (only when not in cleaned mode or no cleaning difference)
    if (!(aspectStartChar !== null && aspectEndChar !== null && autoCleanPhrases)) {
      if (aspectStartChar === index) {
        classes += ' bg-green-300';
      } else if (aspectEndChar === index) {
        classes += ' bg-red-300';
      }
    }

    return classes;
  };

  const getOpinionCharClass = (index: number): string => {
    let classes = 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 text-gray-900 dark:text-gray-100';

    // Check if we have a selection and phrase cleaning is enabled
    if (opinionStartChar !== null && opinionEndChar !== null && autoCleanPhrases) {
      const cleanedPositions = getCleanedPhrasePositions(opinionStartChar, opinionEndChar, displayedText);
      // If cleaned phrase is different, only show the cleaned version
      if (cleanedPositions.start !== opinionStartChar || cleanedPositions.end !== opinionEndChar) {
        if (index >= cleanedPositions.start && index <= cleanedPositions.end) {
          classes += ' bg-blue-300 dark:bg-blue-600 text-black dark:text-white';
        }
        return classes; // Return early, don't show original selection or markers
      }
    }

    // Fallback: show original selection with markers (when cleaning disabled or no difference)  
    if (opinionStartChar !== null && opinionEndChar !== null &&
      index >= opinionStartChar && index <= opinionEndChar) {
      classes += ' bg-blue-300 dark:bg-blue-600 text-black dark:text-white';
    }

    // Start/end markers (only when not in cleaned mode or no cleaning difference)
    if (!(opinionStartChar !== null && opinionEndChar !== null && autoCleanPhrases)) {
      if (opinionStartChar === index) {
        classes += ' bg-green-300';
      } else if (opinionEndChar === index) {
        classes += ' bg-red-300';
      }
    }

    return classes;
  };

  const getSingleFieldCharClass = (index: number): string => {
    let classes = 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 text-gray-900 dark:text-gray-100';

    // Check if we have a selection and phrase cleaning is enabled
    if (selectedStartChar !== null && selectedEndChar !== null && autoCleanPhrases) {
      const cleanedPositions = getCleanedPhrasePositions(selectedStartChar, selectedEndChar, displayedText);
      // If cleaned phrase is different, only show the cleaned version
      if (cleanedPositions.start !== selectedStartChar || cleanedPositions.end !== selectedEndChar) {
        if (index >= cleanedPositions.start && index <= cleanedPositions.end) {
          classes += ' bg-blue-300 dark:bg-blue-600 text-black dark:text-white';
        }
        return classes; // Return early, don't show original selection or markers
      }
    }

    // Fallback: show original selection with markers (when cleaning disabled or no difference)
    if (selectedStartChar !== null && selectedEndChar !== null &&
      index >= selectedStartChar && index <= selectedEndChar) {
      classes += ' bg-blue-300 dark:bg-blue-600 text-black dark:text-white';
    }

    // Start/end markers (only when not in cleaned mode or no cleaning difference)
    if (!(selectedStartChar !== null && selectedEndChar !== null && autoCleanPhrases)) {
      if (selectedStartChar === index) {
        classes += ' bg-green-300';
      } else if (selectedEndChar === index) {
        classes += ' bg-red-300';
      }
    }

    return classes;
  };

  const findTextInDisplayed = (searchText: string): TextPosition | null => {
    if (!searchText || searchText === "NULL" || !displayedText) {
      return { startChar: null, endChar: null };
    }

    const index = displayedText.indexOf(searchText);
    if (index !== -1) {
      return {
        startChar: index,
        endChar: index + searchText.length - 1
      };
    }
    return { startChar: null, endChar: null };
  };

  const openPhrasePopup = (fieldType: FieldType): void => {
    setCurrentEditingField(fieldType);
    setCurrentEditingIndex(null); // Reset for new annotation
    setShowPhrasePopup(true);

    // Check if we're in combined mode
    const showCombined = consideredSentimentElements.includes("aspect_term") && consideredSentimentElements.includes("opinion_term");

    if (showCombined) {
      // For combined popup, pre-select current values if they exist
      const aspectValue = newAspect.aspect_term || "";
      const opinionValue = newAspect.opinion_term || "";

      // Set implicit states
      setIsImplicitAspect(aspectValue === "NULL");
      setIsImplicitOpinion(opinionValue === "NULL");

      // Find and set aspect term selection if not implicit and exists
      if (aspectValue && aspectValue !== "NULL") {
        const aspectPos = findTextInDisplayed(aspectValue);
        setAspectStartChar(aspectPos.startChar);
        setAspectEndChar(aspectPos.endChar);
      } else {
        setAspectStartChar(null);
        setAspectEndChar(null);
      }

      // Find and set opinion term selection if not implicit and exists
      if (opinionValue && opinionValue !== "NULL") {
        const opinionPos = findTextInDisplayed(opinionValue);
        setOpinionStartChar(opinionPos.startChar);
        setOpinionEndChar(opinionPos.endChar);
      } else {
        setOpinionStartChar(null);
        setOpinionEndChar(null);
      }

      // Clear single selection states
      setSelectedStartChar(null);
      setSelectedEndChar(null);

    } else {
      // Single field mode, pre-select current value if it exists
      const currentValue = newAspect[fieldType] || "";

      if (fieldType === "aspect_term") {
        setIsImplicitAspect(currentValue === "NULL");
      } else if (fieldType === "opinion_term") {
        setIsImplicitOpinion(currentValue === "NULL");
      }

      // Find and set current value selection if not implicit and exists
      if (currentValue && currentValue !== "NULL") {
        const textPos = findTextInDisplayed(currentValue);
        setSelectedStartChar(textPos.startChar);
        setSelectedEndChar(textPos.endChar);
      } else {
        setSelectedStartChar(null);
        setSelectedEndChar(null);
      }

      // Clear combined selection states
      setAspectStartChar(null);
      setAspectEndChar(null);
      setOpinionStartChar(null);
      setOpinionEndChar(null);
    }
  };

  const openPhrasePopupForEdit = (fieldType: FieldType, index: number, currentValue: string): void => {
    setCurrentEditingField(fieldType);
    setCurrentEditingIndex(index);
    setShowPhrasePopup(true);

    // Check if we're in combined mode
    const showCombined = consideredSentimentElements.includes("aspect_term") && consideredSentimentElements.includes("opinion_term");

    if (showCombined) {
      // For combined editing, get both current values
      const currentAspectList = [...aspectList];
      const aspectValue = currentAspectList[index]?.aspect_term || "";
      const opinionValue = currentAspectList[index]?.opinion_term || "";

      // Set implicit states
      setIsImplicitAspect(aspectValue === "NULL");
      setIsImplicitOpinion(opinionValue === "NULL");

      // Find and set aspect term selection if not implicit
      if (aspectValue && aspectValue !== "NULL") {
        const aspectPos = findTextInDisplayed(aspectValue);
        setAspectStartChar(aspectPos.startChar);
        setAspectEndChar(aspectPos.endChar);
      } else {
        setAspectStartChar(null);
        setAspectEndChar(null);
      }

      // Find and set opinion term selection if not implicit
      if (opinionValue && opinionValue !== "NULL") {
        const opinionPos = findTextInDisplayed(opinionValue);
        setOpinionStartChar(opinionPos.startChar);
        setOpinionEndChar(opinionPos.endChar);
      } else {
        setOpinionStartChar(null);
        setOpinionEndChar(null);
      }

      // Clear single selection states
      setSelectedStartChar(null);
      setSelectedEndChar(null);

    } else {
      // Single field editing
      if (fieldType === "aspect_term") {
        setIsImplicitAspect(currentValue === "NULL");
      } else if (fieldType === "opinion_term") {
        setIsImplicitOpinion(currentValue === "NULL");
      }

      // Find and set current value selection if not implicit
      if (currentValue && currentValue !== "NULL") {
        const textPos = findTextInDisplayed(currentValue);
        setSelectedStartChar(textPos.startChar);
        setSelectedEndChar(textPos.endChar);
      } else {
        setSelectedStartChar(null);
        setSelectedEndChar(null);
      }

      // Clear combined selection states
      setAspectStartChar(null);
      setAspectEndChar(null);
      setOpinionStartChar(null);
      setOpinionEndChar(null);
    }
  };

  const closePhrasePopup = () => {
    setShowPhrasePopup(false);
    setCurrentEditingField(null);
    setCurrentEditingIndex(null);
    setSelectedStartChar(null);
    setSelectedEndChar(null);
    setAspectStartChar(null);
    setAspectEndChar(null);
    setOpinionStartChar(null);
    setOpinionEndChar(null);
    setIsImplicitAspect(false);
    setIsImplicitOpinion(false);
  };

  const handleCharClick = (charIndex: number): void => {
    let startChar = charIndex;
    let endChar = charIndex;

    // Apply token snapping if enabled
    if (clickOnToken) {
      const tokenBounds = getTokenBounds(displayedText, charIndex);
      if (selectedStartChar === null) {
        // First click - snap to start of token
        startChar = tokenBounds.start;
      } else if (selectedEndChar === null && charIndex >= selectedStartChar) {
        // Second click - snap to end of token
        endChar = tokenBounds.end;
      } else {
        // Reset - snap to start of token
        startChar = tokenBounds.start;
      }
    }

    if (selectedStartChar === null) {
      setSelectedStartChar(startChar);
    } else if (selectedEndChar === null && (clickOnToken ? endChar : charIndex) >= selectedStartChar) {
      setSelectedEndChar(clickOnToken ? endChar : charIndex);
    } else {
      // Reset selection
      setSelectedStartChar(startChar);
      setSelectedEndChar(null);
    }
  };

  const handleAspectCharClick = (charIndex: number): void => {
    let startChar = charIndex;
    let endChar = charIndex;

    // Apply token snapping if enabled
    if (clickOnToken) {
      const tokenBounds = getTokenBounds(displayedText, charIndex);
      if (aspectStartChar === null) {
        // First click - snap to start of token
        startChar = tokenBounds.start;
      } else if (aspectEndChar === null && charIndex >= aspectStartChar) {
        // Second click - snap to end of token
        endChar = tokenBounds.end;
      } else {
        // Reset - snap to start of token
        startChar = tokenBounds.start;
      }
    }

    if (aspectStartChar === null) {
      setAspectStartChar(startChar);
    } else if (aspectEndChar === null && (clickOnToken ? endChar : charIndex) >= aspectStartChar) {
      setAspectEndChar(clickOnToken ? endChar : charIndex);
    } else {
      // Reset selection
      setAspectStartChar(startChar);
      setAspectEndChar(null);
    }
  };

  const handleOpinionCharClick = (charIndex: number): void => {
    let startChar = charIndex;
    let endChar = charIndex;

    // Apply token snapping if enabled
    if (clickOnToken) {
      const tokenBounds = getTokenBounds(displayedText, charIndex);
      if (opinionStartChar === null) {
        // First click - snap to start of token
        startChar = tokenBounds.start;
      } else if (opinionEndChar === null && charIndex >= opinionStartChar) {
        // Second click - snap to end of token
        endChar = tokenBounds.end;
      } else {
        // Reset - snap to start of token
        startChar = tokenBounds.start;
      }
    }

    if (opinionStartChar === null) {
      setOpinionStartChar(startChar);
    } else if (opinionEndChar === null && (clickOnToken ? endChar : charIndex) >= opinionStartChar) {
      setOpinionEndChar(clickOnToken ? endChar : charIndex);
    } else {
      // Reset selection
      setOpinionStartChar(startChar);
      setOpinionEndChar(null);
    }
  };

  const savePhraseSelection = () => {
    // Check if we're showing both fields (combined mode)
    const showCombined = consideredSentimentElements.includes("aspect_term") && consideredSentimentElements.includes("opinion_term");

    if (showCombined) {
      // Handle both aspect term and opinion term
      let aspectPhrase, opinionPhrase;

      if (isImplicitAspect) {
        aspectPhrase = "NULL";
      } else if (aspectStartChar !== null && aspectEndChar !== null) {
        aspectPhrase = cleanPhrase(displayedText.substring(aspectStartChar, aspectEndChar + 1));
      } else {
        aspectPhrase = undefined; // Don't update if no selection and not implicit
      }

      if (isImplicitOpinion) {
        opinionPhrase = "NULL";
      } else if (opinionStartChar !== null && opinionEndChar !== null) {
        opinionPhrase = cleanPhrase(displayedText.substring(opinionStartChar, opinionEndChar + 1));
      } else {
        opinionPhrase = undefined; // Don't update if no selection and not implicit
      }

      if (currentEditingIndex !== null) {
        // Editing existing annotation
        if (aspectPhrase !== undefined) {
          let aspectStart = null, aspectEnd = null;
          if (!isImplicitAspect && aspectStartChar !== null && aspectEndChar !== null) {
            const cleanedPositions = getCleanedPhrasePositions(aspectStartChar, aspectEndChar, displayedText);
            aspectStart = cleanedPositions.start;
            aspectEnd = cleanedPositions.end;
          }
          updateAspectItem(currentEditingIndex, "aspect_term", aspectPhrase, aspectStart, aspectEnd);
        }
        if (opinionPhrase !== undefined) {
          let opinionStart = null, opinionEnd = null;
          if (!isImplicitOpinion && opinionStartChar !== null && opinionEndChar !== null) {
            const cleanedPositions = getCleanedPhrasePositions(opinionStartChar, opinionEndChar, displayedText);
            opinionStart = cleanedPositions.start;
            opinionEnd = cleanedPositions.end;
          }
          updateAspectItem(currentEditingIndex, "opinion_term", opinionPhrase, opinionStart, opinionEnd);
        }
      } else {
        // Adding new annotation
        const updates: Partial<NewAspect> = {};
        if (aspectPhrase !== undefined) {
          updates.aspect_term = aspectPhrase;
          if (savePhrasePositions && !isImplicitAspect && aspectStartChar !== null && aspectEndChar !== null) {
            const cleanedPositions = getCleanedPhrasePositions(aspectStartChar, aspectEndChar, displayedText);
            updates.at_start = cleanedPositions.start;
            updates.at_end = cleanedPositions.end;
          }
        }
        if (opinionPhrase !== undefined) {
          updates.opinion_term = opinionPhrase;
          if (savePhrasePositions && !isImplicitOpinion && opinionStartChar !== null && opinionEndChar !== null) {
            const cleanedPositions = getCleanedPhrasePositions(opinionStartChar, opinionEndChar, displayedText);
            updates.ot_start = cleanedPositions.start;
            updates.ot_end = cleanedPositions.end;
          }
        }
        setNewAspect({ ...newAspect, ...updates });
      }
    } else {
      // Handle single field (original behavior)
      let selectedPhrase;
      if ((currentEditingField === "aspect_term" && isImplicitAspect) ||
        (currentEditingField === "opinion_term" && isImplicitOpinion)) {
        selectedPhrase = "NULL";
      } else if (selectedStartChar !== null && selectedEndChar !== null) {
        selectedPhrase = cleanPhrase(displayedText.substring(selectedStartChar, selectedEndChar + 1));
      }

      if (currentEditingIndex !== null) {
        // Editing existing annotation
        const isImplicit = (currentEditingField === "aspect_term" && isImplicitAspect) ||
          (currentEditingField === "opinion_term" && isImplicitOpinion);
        let startPos = null, endPos = null;
        if (!isImplicit && selectedStartChar !== null && selectedEndChar !== null) {
          const cleanedPositions = getCleanedPhrasePositions(selectedStartChar, selectedEndChar, displayedText);
          startPos = cleanedPositions.start;
          endPos = cleanedPositions.end;
        }
        updateAspectItem(currentEditingIndex, currentEditingField, selectedPhrase, startPos, endPos);
      } else {
        // Adding new annotation
        const updates: any = { [currentEditingField!]: selectedPhrase };
        if (savePhrasePositions && selectedStartChar !== null && selectedEndChar !== null) {
          const isImplicit = (currentEditingField === "aspect_term" && isImplicitAspect) ||
            (currentEditingField === "opinion_term" && isImplicitOpinion);
          if (!isImplicit) {
            const cleanedPositions = getCleanedPhrasePositions(selectedStartChar, selectedEndChar, displayedText);
            if (currentEditingField === "aspect_term") {
              updates.at_start = cleanedPositions.start;
              updates.at_end = cleanedPositions.end;
            } else if (currentEditingField === "opinion_term") {
              updates.ot_start = cleanedPositions.start;
              updates.ot_end = cleanedPositions.end;
            }
          }
        }
        setNewAspect({ ...newAspect, ...updates });
      }
    }

    closePhrasePopup();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      savePhraseSelection();
    }
  };

  const updateAspectItem = (index: number | null, field: keyof AspectItem, value: string | number, startPos: number | null = null, endPos: number | null = null): void => {
    const updatedList = [...aspectList];
    updatedList[index][field] = value;

    if (savePhrasePositions) {
      if (field === "aspect_term") {
        if (value === "NULL" || value === "" || startPos === null || endPos === null) {
          // Remove position data if aspect term is NULL/empty or positions not provided
          delete updatedList[index]["at_start"];
          delete updatedList[index]["at_end"];
        } else {
          // Set position data if aspect term has valid value and positions
          updatedList[index]["at_start"] = startPos;
          updatedList[index]["at_end"] = endPos;
        }
      } else if (field === "opinion_term") {
        if (value === "NULL" || value === "" || startPos === null || endPos === null) {
          // Remove position data if opinion term is NULL/empty or positions not provided
          delete updatedList[index]["ot_start"];
          delete updatedList[index]["ot_end"];
        } else {
          // Set position data if opinion term has valid value and positions
          updatedList[index]["ot_start"] = startPos;
          updatedList[index]["ot_end"] = endPos;
        }
      }
    }

    setAspectList(updatedList);
  };

  const deleteAspectItem = (index: number): void => {
    const updatedList = aspectList.filter((_, i) => i !== index);
    setAspectList(updatedList);
  };

  const clearAllAnnotations = (): void => {
    setAspectList([]);
  };

  const isFieldValid = (fieldName: keyof NewAspect): boolean => {
    const value = newAspect[fieldName];
    if (typeof value === 'string') {
      return value && value.trim() !== "";
    }
    return false;
  };

  const addAnnotation = (): void => {
    // Check if all considered elements are filled
    const isValid = consideredSentimentElements.every(element => {
      const value = (newAspect as any)[element];
      return value && typeof value === 'string' && value.trim() !== "";
    });

    if (isValid) {
      // Create new annotation with only the considered elements
      const newAnnotation: any = {};
      consideredSentimentElements.forEach(element => {
        newAnnotation[element] = (newAspect as any)[element];
      });

      // Add position data if enabled, available, and the corresponding term is not NULL
      if (savePhrasePositions) {
        // Only add aspect position data if aspect_term exists and is not NULL or empty
        if (newAspect.aspect_term &&
          newAspect.aspect_term !== "NULL" &&
          newAspect.aspect_term.trim() !== "" &&
          newAspect.at_start !== undefined &&
          newAspect.at_end !== undefined) {
          newAnnotation.at_start = newAspect.at_start;
          newAnnotation.at_end = newAspect.at_end;
        }

        // Only add opinion position data if opinion_term exists and is not NULL or empty
        if (newAspect.opinion_term &&
          newAspect.opinion_term !== "NULL" &&
          newAspect.opinion_term.trim() !== "" &&
          newAspect.ot_start !== undefined &&
          newAspect.ot_end !== undefined) {
          newAnnotation.ot_start = newAspect.ot_start;
          newAnnotation.ot_end = newAspect.ot_end;
        }
      }

      setAspectList([...aspectList, newAnnotation]);

      // Reset the form
      const resetAspect: any = {};
      consideredSentimentElements.forEach(element => {
        resetAspect[element] = "";
      });
      // Also reset position data
      resetAspect.at_start = undefined;
      resetAspect.at_end = undefined;
      resetAspect.ot_start = undefined;
      resetAspect.ot_end = undefined;
      setNewAspect(resetAspect);
    }
  };

  // Backend API functions
  const fetchSettings = async (): Promise<number | undefined> => {
    try {
      const response = await fetch(`${backendUrl}/settings`);
      const settings = await response.json();

      setConsideredSentimentElements(settings["sentiment elements"]);
      setValidSentimentPolarities(settings["sentiment_polarity options"]);
      setAllowImplicitAspectTerm(settings["implicit_aspect_term_allowed"]);
      setAllowImplicitOpinionTerm(settings["implicit_opinion_term_allowed"]);
      setAutoCleanPhrases(settings["auto_clean_phrases"] !== false); // Default to true
      setSavePhrasePositions(settings["save_phrase_positions"] !== false); // Default to true
      setClickOnToken(settings["click_on_token"] !== false); // Default to true
      setStoreTime(settings["store_time"] === true); // Default to false
      setShowAvgAnnotationTime(settings["show_avg_annotation_time"] === true); // Default to false
      setEnablePrePrediction(settings["enable_pre_prediction"] === true); // Default to false
      setSettingsCurrentIndex(settings["current_index"]);
      setMaxIndex(settings["max_number_of_idxs"]);
      setTotalCount(settings["total_count"]);
      setSessionId(settings["session_id"] || null);

      // Load average annotation time if enabled
      if (settings["show_avg_annotation_time"] === true) {
        await fetchAvgAnnotationTime();
      }

      return settings["current_index"];
    } catch (error) {
      console.error('Error fetching settings:', error);
      return undefined;
    }
  };

  const fetchAvgAnnotationTime = async (): Promise<void> => {
    try {
      const response = await fetch(`${backendUrl}/avg-annotation-time`);
      const data = await response.json();
      setAvgAnnotationTime(data.avg_annotation_time || 0);
    } catch (error) {
      console.error('Error fetching average annotation time:', error);
      setAvgAnnotationTime(0);
    }
  };

  // fetchData: Zeitmessung starten und letzte Annotation merken
  const fetchData = async (index: number): Promise<void> => {
    try {
      const response = await fetch(`${backendUrl}/data/${index}`);
      const data = await response.json();
      // Update aspect category options based on example-specific list
      if (data.aspect_category_list) {
        setValidAspectCategories(data.aspect_category_list);
      }
      setDisplayedText(data.text || "");
      setDisplayedTranslation(data.translation || "");
      let existingAnnotations = [];
      if (data.label && data.label !== "") {
        try {
          existingAnnotations = JSON.parse(data.label);
          if (!Array.isArray(existingAnnotations)) {
            existingAnnotations = [];
          }
        } catch (e) {
          existingAnnotations = [];
        }
      }
      setAspectList(existingAnnotations);
      setLastLoadedAnnotations(existingAnnotations);

      // Timer resetten beim Laden neuer Daten
      resetTimer();
      // Reset form - use current consideredSentimentElements or wait for it to be loaded
      const resetAspect = {};
      if (consideredSentimentElements.length > 0) {
        consideredSentimentElements.forEach(element => {
          resetAspect[element] = "";
        });
        setNewAspect(resetAspect);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchAIPrediction = async (): Promise<void> => {
    try {
      setIsAIPredicting(true);
      const response = await fetch(`${backendUrl}/ai_prediction/${currentIndex}`);
      const predictions = await response.json();

      if (predictions && predictions.length > 0) {
        // Convert predictions to aspectList format
        const aiAnnotations: AspectItem[] = predictions.map((aspect: any) => {
          const annotation: any = {
            aspect_term: aspect.aspect_term || "",
            aspect_category: aspect.aspect_category || "",
            sentiment_polarity: aspect.sentiment_polarity || "",
            opinion_term: aspect.opinion_term || ""
          };
          
          if (aspect.at_start !== undefined && aspect.at_start !== null) {
            annotation.at_start = aspect.at_start;
          }
          if (aspect.at_end !== undefined && aspect.at_end !== null) {
            annotation.at_end = aspect.at_end;
          }
          if (aspect.ot_start !== undefined && aspect.ot_start !== null) {
            annotation.ot_start = aspect.ot_start;
          }
          if (aspect.ot_end !== undefined && aspect.ot_end !== null) {
            annotation.ot_end = aspect.ot_end;
          }
          
          return annotation;
        });

        // Add AI predictions to existing annotations
        setAspectList(aiAnnotations);
      }
    } catch (error) {
      console.error('Error fetching AI prediction:', error);
    } finally {
      setIsAIPredicting(false);
    }
  };

  const saveAnnotations = async (annotations: AspectItem[], skipTiming: boolean = false): Promise<boolean> => {
    // Timing: Duration berechnen und Änderung prüfen (nur wenn nicht übersprungen)
    if (!skipTiming) {
      const duration = getCurrentDuration();
      const change = annotationsChanged(lastLoadedAnnotations, annotations);
      await saveTiming(duration, change);
    }

    try {
      const response = await fetch(`${backendUrl}/annotations/${currentIndex}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: "annotations",
          value: annotations
        }),
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      console.error('Error saving annotations:', error);
    }
    return false;
  };

  const goToNext = async () => {
    if (aspectList.length === 0) return;

    const success = await saveAnnotations(aspectList);
    if (success) {
      // Fetch updated settings to get new current_index
      await fetchSettings();
      const nextIndex = currentIndex + 1;
      if (nextIndex < maxIndex) {
        setCurrentIndex(nextIndex);
        await fetchData(nextIndex);
      }
    }
  };

  const annotateEmpty = async () => {
    // Timing: Duration berechnen und Änderung prüfen
    const duration = getCurrentDuration();
    const change = annotationsChanged(lastLoadedAnnotations, []);
    await saveTiming(duration, change);

    // saveAnnotations ohne Timing aufrufen (skipTiming = true)
    const success = await saveAnnotations([], true);
    if (success) {
      await fetchSettings();
      const nextIndex = currentIndex + 1;
      if (nextIndex < maxIndex) {
        setCurrentIndex(nextIndex);
        await fetchData(nextIndex);
      }
    }
  };

  const goToIndex = async () => {
    // Timer resetten bei Navigation
    resetTimer();

    // Fetch fresh settings first
    await fetchSettings();

    const targetIndexUI = parseInt(inputIndex); // 1-based from UI
    const targetIndex = targetIndexUI - 1; // Convert to 0-based for backend

    // Can navigate up to settingsCurrentIndex + 1 (1-based)
    const maxAllowedUI = settingsCurrentIndex + 1; // settingsCurrentIndex is 0-based, so +1 for 1-based UI

    if (isNaN(targetIndexUI) || targetIndexUI < 1 || targetIndexUI > maxAllowedUI) {
      alert(`Index must be between 1 and ${maxAllowedUI}`);
      return;
    }

    setCurrentIndex(targetIndex);
    await fetchData(targetIndex);
    setInputIndex("");
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      const currentIdx = await fetchSettings();
      if (currentIdx !== undefined) {
        setCurrentIndex(currentIdx); // Set currentIndex to match settingsCurrentIndex initially
        await fetchData(currentIdx);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize form when consideredSentimentElements changes
  useEffect(() => {
    if (consideredSentimentElements.length > 0) {
      const resetAspect = {};
      consideredSentimentElements.forEach(element => {
        resetAspect[element] = "";
      });
      setNewAspect(resetAspect);
    }
  }, [consideredSentimentElements]);

  // Auto-trigger AI prediction when navigating to next item
  useEffect(() => {
    const shouldTriggerAIPrediction = 
      enablePrePrediction && 
      currentIndex === settingsCurrentIndex && 
      !isAIPredicting && 
      aspectList.length === 0; // Only if no annotations exist yet

    if (shouldTriggerAIPrediction) {
      console.log('Auto-triggering AI prediction for last item');
      fetchAIPrediction();
    }
  }, [currentIndex, maxIndex, enablePrePrediction, isAIPredicting, aspectList.length]);

  // Click-Handler für Text: Öffnet Popup je nach konfigurierten Elementen
  const handleTextClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Prüfen ob beide aspect_term und opinion_term konfiguriert sind
    const hasAspectTerm = consideredSentimentElements.includes("aspect_term");
    const hasOpinionTerm = consideredSentimentElements.includes("opinion_term");

    if (!hasAspectTerm && !hasOpinionTerm) {
      return; // Keine relevanten Elemente konfiguriert
    }

    if (hasAspectTerm && hasOpinionTerm) {
      // Beide aktiviert: Combined Popup öffnen - versuche Character-Position zu finden
      try {
        const range = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          let charIndex = range.startOffset;

          // Finde die tatsächliche Position im ursprünglichen Text
          let currentNode = range.startContainer;
          while (currentNode.previousSibling) {
            currentNode = currentNode.previousSibling;
            if (currentNode.nodeType === Node.TEXT_NODE) {
              charIndex += currentNode.textContent?.length || 0;
            }
          }

          const tokenBounds = getTokenBounds(displayedText, charIndex);
          setSelectedStartChar(tokenBounds.start);
          setSelectedEndChar(tokenBounds.end);
          setCurrentEditingField(null);
          setShowPhrasePopup(true);
          return;
        }
      } catch (error) {
        // Fallback: einfach das Combined Popup öffnen ohne Selektion
      }

      // Fallback: Combined Popup ohne spezifische Selektion
      setSelectedStartChar(null);
      setSelectedEndChar(null);
      setCurrentEditingField(null);
      setShowPhrasePopup(true);
    } else if (hasAspectTerm) {
      // Nur aspect_term: Aspect Term Popup öffnen
      openPhrasePopup("aspect_term");
    } else if (hasOpinionTerm) {
      // Nur opinion_term: Opinion Term Popup öffnen
      openPhrasePopup("opinion_term");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ABSA Annotation Tool</h1>
              {sessionId && (
                <span className="ml-4 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-md">
                  Session: {sessionId}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <DarkModeToggle isDark={isDark} onToggle={toggleTheme} />
              {showAvgAnnotationTime && avgAnnotationTime > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Ø {avgAnnotationTime}s per annotation
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={inputIndex}
                  onChange={(e) => setInputIndex(e.target.value)}
                  placeholder="Index..."
                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max={settingsCurrentIndex + 1}
                />
                <button
                  onClick={goToIndex}
                  disabled={!inputIndex || parseInt(inputIndex) < 1 || parseInt(inputIndex) > settingsCurrentIndex + 1}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded"
                >
                  Go to
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {settingsCurrentIndex} annotations completed
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={async () => {
                      // Timer resetten bei Navigation
                      resetTimer();
                      const prevIndex = currentIndex - 1;
                      setCurrentIndex(prevIndex);
                      await fetchData(prevIndex);
                      await fetchSettings(); // Update settings after navigation
                    }}
                    disabled={currentIndex <= 0}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 text-gray-600 dark:text-gray-300"
                    title="Previous annotation"
                  >
                    ←
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentIndex + 1} / {totalCount} Annotations
                  </span>
                  <button
                    onClick={async () => {
                      // Timer resetten bei Navigation
                      resetTimer();
                      const nextIndex = currentIndex + 1;
                      setCurrentIndex(nextIndex);
                      await fetchData(nextIndex);
                      await fetchSettings(); // Update settings after navigation
                    }}
                    disabled={currentIndex + 1 >= settingsCurrentIndex + 1}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 text-gray-600 dark:text-gray-300"
                    title="Next annotation"
                  >
                    →
                  </button>
                  <button
                    onClick={async () => {
                      // Timer resetten bei Navigation
                      resetTimer();
                      setCurrentIndex(settingsCurrentIndex);
                      await fetchData(settingsCurrentIndex);
                      await fetchSettings(); // Update settings after navigation
                    }}
                    disabled={currentIndex === settingsCurrentIndex}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 text-gray-600 dark:text-gray-300"
                    title="Jump to current working position"
                  >
                    ⇒
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">


          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Text to annotate</h2>
              {enablePrePrediction && (
                <button
                  onClick={fetchAIPrediction}
                  disabled={isAIPredicting}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors duration-200 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Get AI predictions"
                >
                  {isAIPredicting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">AI thinking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✨ AI</span>
                    </div>
                  )}
                </button>
              )}
            </div>
            <div className="text-xl text-center bg-gray-100 dark:bg-gray-700 p-4 rounded-xl leading-relaxed text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              onClick={handleTextClick}
              title="Click to add annotation"
            >
              {renderHighlightedText(displayedText, createTextHighlights(displayedText, aspectList, getAnnotationColorClasses))}
            </div>

            {/* Translation section */}
            {displayedTranslation && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Translation</h3>
                <div className="text-lg text-center bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-gray-700 dark:text-gray-300 italic">
                  {displayedTranslation}
                </div>
              </div>
            )}
          </div>

          {/* Annotation Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add aspect</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {consideredSentimentElements.includes("aspect_term") && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Aspect Term
                    {isFieldValid("aspect_term") && <span className="text-blue-500 bg-blue-50 dark:bg-blue-900/50 rounded-full w-4 h-4 flex items-center justify-center ml-2 text-xs">✓</span>}
                  </label>
                  <div
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                    onClick={() => openPhrasePopup("aspect_term")}
                  >
                    <div>
                      {truncateText(newAspect.aspect_term) || "Select phrase"}
                    </div>
                    {newAspect.aspect_term && newAspect.aspect_term !== "NULL" && (() => {
                      const cleanedPhrase = cleanPhrase(newAspect.aspect_term);
                      return cleanedPhrase !== newAspect.aspect_term && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Cleaned: "{truncateText(cleanedPhrase)}"
                        </div>
                      );
                    })()}
                  </div>
                </div>)}

              {consideredSentimentElements.includes("opinion_term") && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Opinion Term
                    {isFieldValid("opinion_term") && <span className="text-blue-500 bg-blue-50 dark:bg-blue-900/50 rounded-full w-4 h-4 flex items-center justify-center ml-2 text-xs">✓</span>}
                  </label>
                  <div
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                    onClick={() => openPhrasePopup("opinion_term")}
                  >
                    <div>
                      {truncateText(newAspect.opinion_term) || "Select phrase"}
                    </div>
                    {newAspect.opinion_term && newAspect.opinion_term !== "NULL" && (() => {
                      const cleanedPhrase = cleanPhrase(newAspect.opinion_term);
                      return cleanedPhrase !== newAspect.opinion_term && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Cleaned: "{truncateText(cleanedPhrase)}"
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {consideredSentimentElements.includes("aspect_category") && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Aspect Category
                    {isFieldValid("aspect_category") && <span className="text-blue-500 bg-blue-50 dark:bg-blue-900/50 rounded-full w-4 h-4 flex items-center justify-center ml-2 text-xs">✓</span>}
                  </label>
                  <select
                    value={newAspect.aspect_category}
                    onChange={(e) => setNewAspect({ ...newAspect, aspect_category: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
                  >
                    <option value="">Select aspect...</option>
                    {validAspectCategories.map(aspect => (
                      <option key={aspect} value={aspect}>{aspect}</option>
                    ))}
                  </select>
                </div>
              )}

              {consideredSentimentElements.includes("sentiment_polarity") && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sentiment Polarity
                    {isFieldValid("sentiment_polarity") && <span className="text-blue-500 bg-blue-50 dark:bg-blue-900/50 rounded-full w-4 h-4 flex items-center justify-center ml-2 text-xs">✓</span>}
                  </label>
                  <select
                    value={newAspect.sentiment_polarity}
                    onChange={(e) => setNewAspect({ ...newAspect, sentiment_polarity: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
                  >
                    <option value="">Select sentiment...</option>
                    {validSentimentPolarities.map(sentiment => (
                      <option key={sentiment} value={sentiment}>{sentiment}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={addAnnotation}
                disabled={!consideredSentimentElements.every(element => {
                  const value = newAspect[element];
                  return value && value.trim() !== "";
                })}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Add aspect
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Added annotations ({aspectList.length})</h2>
              {aspectList.length > 0 && (
                <button
                  onClick={clearAllAnnotations}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete all annotations ({aspectList.length}) 🗑️
                </button>
              )}
            </div>

            {aspectList.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No annotations available</p>
            ) : (
              <div className="space-y-3">
                {aspectList.map((aspect, index) => {
                  const colorClasses = getAnnotationColorClasses(index);
                  return (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700 flex items-center gap-3">
                      {/* Color indicator */}
                      <div className={`w-4 h-4 rounded-full ${colorClasses.bg300} flex-shrink-0`}></div>

                      {consideredSentimentElements.includes("aspect_term") && (
                        <div
                          className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-gray-100"
                          onClick={() => {
                            openPhrasePopupForEdit("aspect_term", index, aspect.aspect_term);
                          }}
                        >
                          <span className="truncate">{truncateText(aspect.aspect_term) || "Select phrase"}</span>
                        </div>
                      )}                      {consideredSentimentElements.includes("opinion_term") && (
                        <div
                          className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-gray-100"
                          onClick={() => {
                            openPhrasePopupForEdit("opinion_term", index, aspect.opinion_term);
                          }}
                        >
                          <span className="truncate">{truncateText(aspect.opinion_term) || "Select phrase"}</span>
                        </div>
                      )}

                      {consideredSentimentElements.includes("aspect_category") && (
                        <select
                          value={aspect.aspect_category}
                          onChange={(e) => updateAspectItem(index, "aspect_category", e.target.value)}
                          className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                          {validAspectCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}

                      {consideredSentimentElements.includes("sentiment_polarity") && (
                        <select
                          value={aspect.sentiment_polarity}
                          onChange={(e) => updateAspectItem(index, "sentiment_polarity", e.target.value)}
                          className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                          {validSentimentPolarities.map(sentiment => (
                            <option key={sentiment} value={sentiment}>{sentiment}</option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={() => deleteAspectItem(index)}
                        className="w-8 h-8 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded flex-shrink-0 border border-red-200 dark:border-red-800"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Navigation Buttons */}
          <div className="mt-6 flex gap-3 justify-end">
            {aspectList.length > 0 ? (
              <button
                onClick={goToNext}
                disabled={false}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {currentIndex + 1 >= maxIndex ? "Save & Finish" : "Save & Next annotation →"}
              </button>
            ) : (
              <button
                onClick={annotateEmpty}
                disabled={false}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {currentIndex + 1 >= maxIndex ? "Save empty list & Finish" : "Save & Annotate empty list"}
              </button>
            )}
          </div>
        </div>

        {/* Phrase Selection Popup */}
        {showPhrasePopup && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closePhrasePopup}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onKeyDown={handleKeyDown}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Check if we should show combined popup */}
              {consideredSentimentElements.includes("aspect_term") && consideredSentimentElements.includes("opinion_term") ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Select phrases for Aspect Term and Opinion Term
                  </h3>

                  <div className="space-y-6">
                    {/* Aspect Term Section */}
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">Aspect Term</h4>
                        {allowImplicitAspectTerm && (
                          <CustomCheckbox
                            checked={isImplicitAspect}
                            onChange={setIsImplicitAspect}
                            label="Implicit aspect"
                          />
                        )}
                      </div>

                      <div>
                        {!isImplicitAspect ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Click on the start and end characters for the aspect term:
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                            Text display (selection disabled for implicit aspect):
                          </p>
                        )}
                        {autoCleanPhrases && !isImplicitAspect && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            <span className="bg-blue-600 px-2 py-1 mr-1 rounded text-white">Blue highlight</span>: Selected phrase (cleaned automatically if needed)
                          </div>
                        )}
                        <div className="text-lg leading-relaxed p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                          {displayedText.split('').map((char, index) => (
                            <span
                              key={`aspect-${index}`}
                              onClick={!isImplicitAspect ? () => handleAspectCharClick(index) : undefined}
                              className={!isImplicitAspect ? getAspectCharClass(index) : ""}
                              style={isImplicitAspect ? { cursor: 'default' } : {}}
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                        {!isImplicitAspect && (
                          <div className="mt-3 space-y-2 text-gray-900 dark:text-gray-100">
                            <div>
                              <strong>Selected text:</strong> {aspectStartChar !== null && aspectEndChar !== null ? `"${displayedText.substring(aspectStartChar, aspectEndChar + 1)}"` : ""}
                            </div>
                            {aspectStartChar !== null && aspectEndChar !== null && (() => {
                              const originalText = displayedText.substring(aspectStartChar, aspectEndChar + 1);
                              const cleanedText = cleanPhrase(originalText);
                              if (originalText !== cleanedText) {
                                const cleanedPositions = getCleanedPhrasePositions(aspectStartChar, aspectEndChar, displayedText);
                                return (
                                  <>
                                    <div>
                                      <strong>Cleaned aspect phrase:</strong> "<span className="text-green-600 dark:text-green-400">{cleanedText}</span>"
                                    </div>
                                    {savePhrasePositions && (
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Saved positions: {cleanedPositions.start} - {cleanedPositions.end}
                                      </div>
                                    )}
                                  </>
                                );
                              } else if (savePhrasePositions) {
                                return (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Saved positions: {aspectStartChar} - {aspectEndChar}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {savePhrasePositions && (aspectStartChar === null || aspectEndChar === null) && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Saved positions:
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Opinion Term Section */}
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">Opinion Term</h4>
                        {allowImplicitOpinionTerm && (
                          <CustomCheckbox
                            checked={isImplicitOpinion}
                            onChange={setIsImplicitOpinion}
                            label="Implicit opinion"
                          />
                        )}
                      </div>

                      <div>
                        {!isImplicitOpinion ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Click on the start and end characters for the opinion term:
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                            Text display (selection disabled for implicit opinion):
                          </p>
                        )}
                        {autoCleanPhrases && !isImplicitOpinion && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            <span className="bg-blue-600 px-2 py-1 mr-1 rounded text-white">Blue highlight</span>: Selected phrase (cleaned automatically if needed)
                          </div>
                        )}
                        <div className="text-lg leading-relaxed p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                          {displayedText.split('').map((char, index) => (
                            <span
                              key={`opinion-${index}`}
                              onClick={!isImplicitOpinion ? () => handleOpinionCharClick(index) : undefined}
                              className={!isImplicitOpinion ? getOpinionCharClass(index) : ""}
                              style={isImplicitOpinion ? { cursor: 'default' } : {}}
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                        {!isImplicitOpinion && (
                          <div className="mt-3 space-y-2 text-gray-900 dark:text-gray-100">
                            <div>
                              <strong>Selected text:</strong> {opinionStartChar !== null && opinionEndChar !== null ? `"${displayedText.substring(opinionStartChar, opinionEndChar + 1)}"` : ""}
                            </div>
                            {opinionStartChar !== null && opinionEndChar !== null && (() => {
                              const originalText = displayedText.substring(opinionStartChar, opinionEndChar + 1);
                              const cleanedText = cleanPhrase(originalText);
                              if (originalText !== cleanedText) {
                                const cleanedPositions = getCleanedPhrasePositions(opinionStartChar, opinionEndChar, displayedText);
                                return (
                                  <>
                                    <div>
                                      <strong>Cleaned opinion phrase:</strong> "<span className="text-green-600 dark:text-green-400">{cleanedText}</span>"
                                    </div>
                                    {savePhrasePositions && (
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Saved positions: {cleanedPositions.start} - {cleanedPositions.end}
                                      </div>
                                    )}
                                  </>
                                );
                              } else if (savePhrasePositions) {
                                return (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Saved positions: {opinionStartChar} - {opinionEndChar}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {savePhrasePositions && (opinionStartChar === null || opinionEndChar === null) && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Saved positions:
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Select phrase for {currentEditingField === "aspect_term" ? "Aspect Term" : "Opinion Term"}
                  </h3>

                  {((currentEditingField === "aspect_term" && allowImplicitAspectTerm) ||
                    (currentEditingField === "opinion_term" && allowImplicitOpinionTerm)) && (
                      <div className="mb-4">
                        <CustomCheckbox
                          checked={currentEditingField === "aspect_term" ? isImplicitAspect : isImplicitOpinion}
                          onChange={(checked) => {
                            if (currentEditingField === "aspect_term") {
                              setIsImplicitAspect(checked);
                            } else {
                              setIsImplicitOpinion(checked);
                            }
                          }}
                          label={currentEditingField === "aspect_term" ? "Implicit aspect" : "Implicit opinion"}
                          className="mb-4"
                        />
                      </div>
                    )}

                  <div className="mb-6">
                    {!((currentEditingField === "aspect_term" && isImplicitAspect) ||
                      (currentEditingField === "opinion_term" && isImplicitOpinion)) ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Click on the start character and then on the end character of the phrase:
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                        Text display (selection disabled for implicit {currentEditingField === "aspect_term" ? "aspect" : "opinion"}):
                      </p>
                    )}
                    {autoCleanPhrases && !((currentEditingField === "aspect_term" && isImplicitAspect) ||
                      (currentEditingField === "opinion_term" && isImplicitOpinion)) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <span className="bg-blue-300 dark:bg-blue-600 px-1 rounded text-black dark:text-white">Blue highlight</span>: Selected phrase (cleaned automatically if needed)
                        </div>
                      )}
                    <div className="text-lg leading-relaxed p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      {displayedText.split('').map((char, index) => (
                        <span
                          key={index}
                          onClick={!((currentEditingField === "aspect_term" && isImplicitAspect) ||
                            (currentEditingField === "opinion_term" && isImplicitOpinion)) ?
                            () => handleCharClick(index) : undefined}
                          className={!((currentEditingField === "aspect_term" && isImplicitAspect) ||
                            (currentEditingField === "opinion_term" && isImplicitOpinion)) ?
                            getSingleFieldCharClass(index) : ""}
                          style={((currentEditingField === "aspect_term" && isImplicitAspect) ||
                            (currentEditingField === "opinion_term" && isImplicitOpinion)) ?
                            { cursor: 'default' } : {}}
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                    {!((currentEditingField === "aspect_term" && isImplicitAspect) ||
                      (currentEditingField === "opinion_term" && isImplicitOpinion)) && (
                        <div className="mt-3 space-y-2 text-gray-900 dark:text-gray-100">
                          <div>
                            <strong>Selected text:</strong> {selectedStartChar !== null && selectedEndChar !== null ? `"${displayedText.substring(selectedStartChar, selectedEndChar + 1)}"` : ""}
                          </div>
                          {selectedStartChar !== null && selectedEndChar !== null && (() => {
                            const originalText = displayedText.substring(selectedStartChar, selectedEndChar + 1);
                            const cleanedText = cleanPhrase(originalText);
                            if (originalText !== cleanedText) {
                              const cleanedPositions = getCleanedPhrasePositions(selectedStartChar, selectedEndChar, displayedText);
                              return (
                                <>
                                  <div>
                                    <strong>Cleaned phrase:</strong> "<span className="text-green-600 dark:text-green-400">{cleanedText}</span>"
                                  </div>
                                  {savePhrasePositions && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      Saved positions: {cleanedPositions.start} - {cleanedPositions.end}
                                    </div>
                                  )}
                                </>
                              );
                            } else if (savePhrasePositions) {
                              return (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Saved positions: {selectedStartChar} - {selectedEndChar}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {savePhrasePositions && (selectedStartChar === null || selectedEndChar === null) && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Saved positions:
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={closePhrasePopup}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={savePhraseSelection}
                  disabled={
                    consideredSentimentElements.includes("aspect_term") && consideredSentimentElements.includes("opinion_term") ?
                      // Combined mode: BOTH fields must be valid
                      !(isImplicitAspect || (aspectStartChar !== null && aspectEndChar !== null)) ||
                      !(isImplicitOpinion || (opinionStartChar !== null && opinionEndChar !== null))
                      :
                      // Single mode: current field must be valid
                      !((currentEditingField === "aspect_term" && isImplicitAspect) ||
                        (currentEditingField === "opinion_term" && isImplicitOpinion)) &&
                      (selectedStartChar === null || selectedEndChar === null)
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Contact Info */}
      <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-center gap-2">
            <span>Built with ❤️ for the NLP community by</span>
            <a
              href="mailto:Nils-Constantin.Hellwig@ur.de"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-200"
            >
              Nils-Constantin.Hellwig@ur.de
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
