import React, { useState } from "react";

function App() {

  const [displayedText, setDisplayedText] = useState("Die Pizza war lecker, aber der Service war schrecklich.");
  const [consideredSentimentElements, setConsideredSentimentElements] = useState(["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"]);
  const [newAspect, setNewAspect] = useState({
    "aspect_term": "",
    "aspect_category": "",
    "sentiment_polarity": "",
    "opinion_term": ""
  });

  const [validAspectCategories, setValidAspectCategories] = useState(["food general", "service general", "price general", "ambience general"]);
  const [validSentimentPolarities, setValidSentimentPolarities] = useState(["positive", "neutral", "negative"]);

  const [aspectList, setAspectList] = useState([
    {
      "aspect_term": "NULL",
      "aspect_category": "food general",
      "sentiment_polarity": "positive",
      "opinion_term": "lecker"
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Text to Annotate</h2>
            <div className="text-xl text-center bg-indigo-50 p-4 rounded-xl">{displayedText}</div>
          </div>

          {/* Annotation Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Annotation</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {consideredSentimentElements.includes("aspect_term") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Term</label>
                  <input
                    type="text"
                    value={newAspect.aspect_term}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>)}
              {consideredSentimentElements.includes("aspect_category") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Category</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sentiment Polarity</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opinion Term</label>
                  <input
                    type="text"
                    value={newAspect.opinion_term}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => {

              }}
              disabled={!newAspect.aspect_term || !newAspect.aspect_category || !newAspect.sentiment_polarity || !newAspect.opinion_term}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Add Annotation
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Annotations</h2>

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
