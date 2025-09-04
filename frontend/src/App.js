import React, { useState } from "react";

function App() {

  const [displayedText, setDisplayedText] = useState("Die Pizza war lecker, aber wir wurden schlecht bedient.");
  const [consideredSentimentElements, setConsideredSentimentElements] = useState(["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"]);
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

  const [validAspectCategories, setValidAspectCategories] = useState(["food general", "service general", "price general", "ambience general"]);
  const [validSentimentPolarities, setValidSentimentPolarities] = useState(["positive", "neutral", "negative"]);
  const [allowImplicitAspectTerm, setAllowImplicitAspectTerm] = useState(true);
  const [allowImplicitOpinionTerm, setAllowImplicitOpinionTerm] = useState(false);

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

  const [aspectList, setAspectList] = useState([
    {
      "aspect_term": "Pizza",
      "aspect_category": "food general",
      "sentiment_polarity": "positive",
      "opinion_term": "lecker"
    },
    {
      "aspect_term": "NULL",
      "aspect_category": "service general",
      "sentiment_polarity": "negative",
      "opinion_term": "schrecklich"
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ABSA Annotation Tool</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500"> 4 / 574 Annotations</span>
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
          </div>

          {/* Annotation Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Annotation</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {consideredSentimentElements.includes("aspect_term") && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Aspect Term</label>
                  <div 
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => openPhrasePopup("aspect_term")}
                  >
                    {truncateText(newAspect.aspect_term) || "Phrase auswählen"}
                  </div>
                </div>)}
              {consideredSentimentElements.includes("aspect_category") && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Aspect Category</label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-2">Sentiment Polarity</label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-2">Opinion Term</label>
                  <div 
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => openPhrasePopup("opinion_term")}
                  >
                    {truncateText(newAspect.opinion_term) || "Phrase auswählen"}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={addAnnotation}
              disabled={!consideredSentimentElements.every(element => {
                const value = newAspect[element];
                return value && value.trim() !== "";
              })}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-2 py-1 rounded-lg font-medium transition-colors"
            >
              Add annotation
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Added annotations</h2>
            
            {aspectList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keine Annotationen vorhanden</p>
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
                          <span className="truncate">{truncateText(aspect.aspect_term) || "Phrase auswählen"}</span>
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
                          <span className="truncate">{truncateText(aspect.opinion_term) || "Phrase auswählen"}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => deleteAspectItem(index)}
                      className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded flex-shrink-0 border border-red-200"
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Phrase Selection Popup */}
        {showPhrasePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4" onKeyDown={handleKeyDown} tabIndex={-1}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Phrase auswählen für {currentEditingField === "aspect_term" ? "Aspect Term" : "Opinion Term"}
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
                    <span className="text-sm text-gray-700">Impliziter Aspekt</span>
                  </label>
                </div>
              )}

              {!isImplicitAspect && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3">
                    Klicken Sie auf den Startcharakter und dann auf den Endcharakter der Phrase:
                  </p>
                  <div className="text-lg leading-relaxed p-4 border rounded-lg bg-gray-50">
                    {displayedText.split('').map((char, index) => (
                      <span
                        key={index}
                        onClick={() => handleCharClick(index)}
                        className={`cursor-pointer hover:bg-blue-200 ${
                          selectedStartChar !== null && selectedEndChar !== null &&
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
                      <strong>Ausgewählte Phrase:</strong> "{displayedText.substring(selectedStartChar, selectedEndChar + 1).trim()}"
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closePhrasePopup}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={savePhraseSelection}
                  disabled={!isImplicitAspect && (selectedStartChar === null || selectedEndChar === null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Fertig
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
