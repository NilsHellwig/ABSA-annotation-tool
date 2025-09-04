import React, { useState, useEffect } from "react";

function App() {

  const [displayedText, setDisplayedText] = useState("");
  const [displayedTranslation, setDisplayedTranslation] = useState("");
  const [consideredSentimentElements, setConsideredSentimentElements] = useState([]);
  const [newAspect, setNewAspect] = useState({
    "aspect_term": "",
    "aspect_category": "",
    "sentiment_polarity": "",
    "opinion_term": ""
  });

  // Popup states
  const [showPhrasePopup, setShowPhrasePopup] = useState(false);
  const [currentEditingField, setCurrentEditingField] = useState(null);
  const [selectedStartChar, setSelectedStartChar] = useState(null);
  const [selectedEndChar, setSelectedEndChar] = useState(null);
  const [isImplicitAspect, setIsImplicitAspect] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null); // For editing existing items

  const [validAspectCategories, setValidAspectCategories] = useState([]);
  const [validSentimentPolarities, setValidSentimentPolarities] = useState([]);
  const [allowImplicitAspectTerm, setAllowImplicitAspectTerm] = useState(false);
  const [allowImplicitOpinionTerm, setAllowImplicitOpinionTerm] = useState(false);

  // Backend states
  const [currentIndex, setCurrentIndex] = useState(0); // Currently displayed index in UI
  const [settingsCurrentIndex, setSettingsCurrentIndex] = useState(0); // Current index from backend settings
  const [maxIndex, setMaxIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [inputIndex, setInputIndex] = useState("");
  const [sessionId, setSessionId] = useState(null);

  // Helper functions
  const truncateText = (text, maxLength = 32) => {
    if (!text) return text;
    const trimmedText = text.trim();
    if (trimmedText.length <= maxLength) return trimmedText;
    return trimmedText.substring(0, maxLength) + "...";
  };

  const openPhrasePopup = (fieldType) => {
    setCurrentEditingField(fieldType);
    setCurrentEditingIndex(null); // Reset for new annotation
    setShowPhrasePopup(true);
    setSelectedStartChar(null);
    setSelectedEndChar(null);
    setIsImplicitAspect(false);
  };

  const openPhrasePopupForEdit = (currentValue) => {
    setShowPhrasePopup(true);
    setSelectedStartChar(null);
    setSelectedEndChar(null);
    setIsImplicitAspect(currentValue === "NULL");
  };

  const closePhrasePopup = () => {
    setShowPhrasePopup(false);
    setCurrentEditingField(null);
    setCurrentEditingIndex(null);
    setSelectedStartChar(null);
    setSelectedEndChar(null);
    setIsImplicitAspect(false);
  };

  const handleCharClick = (charIndex) => {
    if (selectedStartChar === null) {
      setSelectedStartChar(charIndex);
    } else if (selectedEndChar === null && charIndex >= selectedStartChar) {
      setSelectedEndChar(charIndex);
    } else {
      // Reset selection
      setSelectedStartChar(charIndex);
      setSelectedEndChar(null);
    }
  };

  const savePhraseSelection = () => {
    let selectedPhrase;
    if (isImplicitAspect) {
      selectedPhrase = "NULL";
    } else if (selectedStartChar !== null && selectedEndChar !== null) {
      selectedPhrase = displayedText.substring(selectedStartChar, selectedEndChar + 1).trim();
    }

    if (currentEditingIndex !== null) {
      // Editing existing annotation
      updateAspectItem(currentEditingIndex, currentEditingField, selectedPhrase);
    } else {
      // Adding new annotation
      setNewAspect({ ...newAspect, [currentEditingField]: selectedPhrase });
    }

    closePhrasePopup();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      savePhraseSelection();
    }
  };

  const updateAspectItem = (index, field, value) => {
    const updatedList = [...aspectList];
    updatedList[index][field] = value;
    setAspectList(updatedList);
  };

  const deleteAspectItem = (index) => {
    const updatedList = aspectList.filter((_, i) => i !== index);
    setAspectList(updatedList);
  };

  const clearAllAnnotations = () => {
    setAspectList([]);
  };

  const isFieldValid = (fieldName) => {
    const value = newAspect[fieldName];
    return value && value.trim() !== "";
  };

  const addAnnotation = () => {
    // Check if all considered elements are filled
    const isValid = consideredSentimentElements.every(element => {
      const value = newAspect[element];
      return value && value.trim() !== "";
    });

    if (isValid) {
      // Create new annotation with only the considered elements
      const newAnnotation = {};
      consideredSentimentElements.forEach(element => {
        newAnnotation[element] = newAspect[element];
      });

      setAspectList([...aspectList, newAnnotation]);

      // Reset the form
      const resetAspect = {};
      consideredSentimentElements.forEach(element => {
        resetAspect[element] = "";
      });
      setNewAspect(resetAspect);
    }
  };

  // Backend API functions
  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:8000/settings');
      const settings = await response.json();

      setConsideredSentimentElements(settings["sentiment elements"]);
      setValidAspectCategories(settings["aspect_categories"]);
      setValidSentimentPolarities(settings["sentiment_polarity options"]);
      setAllowImplicitAspectTerm(settings["implicit_aspect_term_allowed"]);
      setAllowImplicitOpinionTerm(settings["implicit_opinion_term_allowed"]);
      setSettingsCurrentIndex(settings["current_index"]);
      setMaxIndex(settings["max_number_of_idxs"]);
      setTotalCount(settings["total_count"]);
      setSessionId(settings["session_id"] || null);

      return settings["current_index"];
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchData = async (index) => {
    try {
      const response = await fetch(`http://localhost:8000/data/${index}`);
      const data = await response.json();

      setDisplayedText(data.text || "");
      setDisplayedTranslation(data.translation || "");

      // Load existing annotations if they exist
      let existingAnnotations = [];
      if (data.label && data.label !== "") {
        try {
          existingAnnotations = JSON.parse(data.label);
          if (!Array.isArray(existingAnnotations)) {
            existingAnnotations = [];
          }
        } catch (e) {
          console.log('Could not parse existing annotations:', e);
          existingAnnotations = [];
        }
      }
      setAspectList(existingAnnotations);

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
  };  const saveAnnotations = async (annotations) => {
    try {
      const response = await fetch(`http://localhost:8000/annotations/${currentIndex}`, {
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
        console.log('Annotations saved successfully');
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
    const success = await saveAnnotations([]);
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

  const goToIndex = async () => {
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

  const [aspectList, setAspectList] = useState([]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ABSA Annotation Tool</h1>
              {sessionId && (
                <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md">
                  Session: {sessionId}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={inputIndex}
                  onChange={(e) => setInputIndex(e.target.value)}
                  placeholder="Index..."
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max={settingsCurrentIndex + 1}
                />
                <button
                  onClick={goToIndex}
                  disabled={!inputIndex || parseInt(inputIndex) < 1 || parseInt(inputIndex) > settingsCurrentIndex + 1}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded"
                >
                  Go to
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {settingsCurrentIndex} annotations completed
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={async () => {
                      const prevIndex = currentIndex - 1;
                      setCurrentIndex(prevIndex);
                      await fetchData(prevIndex);
                      await fetchSettings(); // Update settings after navigation
                    }}
                    disabled={currentIndex <= 0}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-600"
                    title="Previous annotation"
                  >
                    ←
                  </button>
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {totalCount} Annotations
                  </span>
                  <button
                    onClick={async () => {
                      const nextIndex = currentIndex + 1;
                      setCurrentIndex(nextIndex);
                      await fetchData(nextIndex);
                      await fetchSettings(); // Update settings after navigation
                    }}
                    disabled={currentIndex + 1 >= settingsCurrentIndex + 1}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-600"
                    title="Next annotation"
                  >
                    →
                  </button>
                  <button
                    onClick={async () => {
                      setCurrentIndex(settingsCurrentIndex);
                      await fetchData(settingsCurrentIndex);
                      await fetchSettings(); // Update settings after navigation
                    }}
                    disabled={currentIndex === settingsCurrentIndex}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-600"
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


          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Text to annotate</h2>
            <div className="text-xl text-center bg-gray-100 p-4 rounded-xl">{displayedText}</div>
            
            {/* Translation section */}
            {displayedTranslation && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Translation</h3>
                <div className="text-lg text-center bg-blue-50 p-4 rounded-xl text-gray-700 italic">
                  {displayedTranslation}
                </div>
              </div>
            )}
          </div>

          {/* Annotation Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add aspect</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {consideredSentimentElements.includes("aspect_term") && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
                    Aspect Term
                    {isFieldValid("aspect_term") && <span className="text-blue-500 bg-blue-50 rounded-full w-4 h-4 flex items-center justify-center ml-2 text-xs">✓</span>}
                  </label>
                  <div
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => openPhrasePopup("aspect_term")}
                  >
                    {truncateText(newAspect.aspect_term) || "Select phrase"}
                  </div>
                </div>)}
              {consideredSentimentElements.includes("aspect_category") && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
                    Aspect Category
                    {isFieldValid("aspect_category") && <span className="text-blue-500 bg-blue-50 rounded-full w-4 h-4 flex items-center justify-center ml-2 text-xs">✓</span>}
                  </label>
                  <select
                    value={newAspect.aspect_category}
                    onChange={(e) => setNewAspect({ ...newAspect, aspect_category: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
                    Sentiment Polarity
                    {isFieldValid("sentiment_polarity") && <span className="text-blue-500 bg-blue-50 rounded-full w-4 h-4 flex items-center justify-center ml-2 text-xs">✓</span>}
                  </label>
                  <select
                    value={newAspect.sentiment_polarity}
                    onChange={(e) => setNewAspect({ ...newAspect, sentiment_polarity: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select sentiment...</option>
                    {validSentimentPolarities.map(sentiment => (
                      <option key={sentiment} value={sentiment}>{sentiment}</option>
                    ))}
                  </select>
                </div>
              )}

              {consideredSentimentElements.includes("opinion_term") && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
                    Opinion Term
                    {isFieldValid("opinion_term") && <span className="text-blue-500 bg-blue-50 rounded-full w-4 h-4 flex items-center justify-center ml-2 text-xs">✓</span>}
                  </label>
                  <div
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => openPhrasePopup("opinion_term")}
                  >
                    {truncateText(newAspect.opinion_term) || "Select phrase"}
                  </div>
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
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Add aspect
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Added annotations ({aspectList.length})</h2>
              {aspectList.length > 0 && (
                <button
                  onClick={clearAllAnnotations}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {aspectList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No annotations available</p>
            ) : (
              <div className="space-y-3">
                {aspectList.map((aspect, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center gap-3">
                    {consideredSentimentElements.includes("aspect_term") && (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium text-gray-700 w-8 flex-shrink-0">AT:</span>
                        <div
                          className="flex-1 p-2 border border-gray-200 rounded bg-white cursor-pointer hover:bg-gray-50 text-sm"
                          onClick={() => {
                            setCurrentEditingField("aspect_term");
                            setCurrentEditingIndex(index);
                            openPhrasePopupForEdit(aspect.aspect_term);
                          }}
                        >
                          <span className="truncate">{truncateText(aspect.aspect_term) || "Select phrase"}</span>
                        </div>
                      </div>
                    )}

                    {consideredSentimentElements.includes("aspect_category") && (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium text-gray-700 w-8 flex-shrink-0">AC:</span>
                        <select
                          value={aspect.aspect_category}
                          onChange={(e) => updateAspectItem(index, "aspect_category", e.target.value)}
                          className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          {validAspectCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {consideredSentimentElements.includes("sentiment_polarity") && (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium text-gray-700 w-8 flex-shrink-0">SP:</span>
                        <select
                          value={aspect.sentiment_polarity}
                          onChange={(e) => updateAspectItem(index, "sentiment_polarity", e.target.value)}
                          className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          {validSentimentPolarities.map(sentiment => (
                            <option key={sentiment} value={sentiment}>{sentiment}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {consideredSentimentElements.includes("opinion_term") && (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium text-gray-700 w-8 flex-shrink-0">OT:</span>
                        <div
                          className="flex-1 p-2 border border-gray-200 rounded bg-white cursor-pointer hover:bg-gray-50 text-sm"
                          onClick={() => {
                            setCurrentEditingField("opinion_term");
                            setCurrentEditingIndex(index);
                            openPhrasePopupForEdit(aspect.opinion_term);
                          }}
                        >
                          <span className="truncate">{truncateText(aspect.opinion_term) || "Select phrase"}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => deleteAspectItem(index)}
                      className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded flex-shrink-0 border border-red-200"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Navigation Buttons */}
          <div className="mt-6 flex gap-3 justify-end">
            {aspectList.length > 0 ? (
              <button
                onClick={goToNext}
                disabled={currentIndex >= maxIndex - 1}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Next annotation →
              </button>
            ) : (
              <button
                onClick={annotateEmpty}
                disabled={currentIndex >= maxIndex - 1}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Annotate empty list
              </button>
            )}
          </div>
        </div>

        {/* Phrase Selection Popup */}
        {showPhrasePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4" onKeyDown={handleKeyDown} tabIndex={-1}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select phrase for {currentEditingField === "aspect_term" ? "Aspect Term" : "Opinion Term"}
              </h3>

              {((currentEditingField === "aspect_term" && allowImplicitAspectTerm) ||
                (currentEditingField === "opinion_term" && allowImplicitOpinionTerm)) && (
                  <div className="mb-4">
                    <label className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        checked={isImplicitAspect}
                        onChange={(e) => setIsImplicitAspect(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Implicit aspect</span>
                    </label>
                  </div>
                )}

              {!isImplicitAspect && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3">
                    Click on the start character and then on the end character of the phrase:
                  </p>
                  <div className="text-lg leading-relaxed p-4 border rounded-lg bg-gray-50">
                    {displayedText.split('').map((char, index) => (
                      <span
                        key={index}
                        onClick={() => handleCharClick(index)}
                        className={`cursor-pointer hover:bg-blue-200 ${selectedStartChar !== null && selectedEndChar !== null &&
                            index >= selectedStartChar && index <= selectedEndChar
                            ? 'bg-blue-300'
                            : selectedStartChar === index
                              ? 'bg-green-300'
                              : selectedEndChar === index
                                ? 'bg-red-300'
                                : ''
                          }`}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                  {selectedStartChar !== null && selectedEndChar !== null && (
                    <div className="mt-3">
                      <strong>Selected phrase:</strong> "{displayedText.substring(selectedStartChar, selectedEndChar + 1).trim()}"
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closePhrasePopup}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={savePhraseSelection}
                  disabled={!isImplicitAspect && (selectedStartChar === null || selectedEndChar === null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
