/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import { Deal, UserPreferences, PriceDataPoint, DealVerification, GroundingMetadata } from './types';
import { APP_TITLE, DEAL_CATEGORIES, MOCK_API_KEY_NOTICE, GEMINI_ERROR_MESSAGE, INITIAL_DEALS_COUNT } from './constants';
import * as geminiService from './services/geminiService';
import DealCard from './components/DealCard';
import SearchBarAndFilters from './components/SearchBarAndFilters';
import PriceHistoryModal from './components/PriceHistoryModal';
import DealVerificationModal from './components/DealVerificationModal';
import LoadingSpinner from './components/LoadingSpinner';
import { TagIcon, LinkIcon } from './components/icons';

const App: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    keywords: '',
    categories: [],
    location: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);

  const [selectedDealForHistory, setSelectedDealForHistory] = useState<Deal | null>(null);
  const [priceHistoryData, setPriceHistoryData] = useState<PriceDataPoint[]>([]);
  
  const [selectedDealForVerification, setSelectedDealForVerification] = useState<Deal | null>(null);
  const [verificationData, setVerificationData] = useState<DealVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [groundingMetadata, setGroundingMetadata] = useState<GroundingMetadata | undefined>(undefined);


  const fetchDeals = useCallback(async (prefs: UserPreferences, useSearchGrounding: boolean = false) => {
    setIsLoading(true);
    setError(null);
    setGroundingMetadata(undefined);
    try {
      const { deals: fetchedDeals, groundingMetadata: newGroundingMetadata } = await geminiService.generateDeals(prefs, useSearchGrounding);
      setDeals(fetchedDeals);
      if (newGroundingMetadata) {
        setGroundingMetadata(newGroundingMetadata);
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      if (errorMessage === "API_KEY_MISSING") {
        setApiKeyMissing(true);
        setError(MOCK_API_KEY_NOTICE);
        // Load some placeholder deals if API key is missing
        setDeals(Array.from({ length: INITIAL_DEALS_COUNT }).map((_, i) => ({
          id: `mock-${i}`,
          title: `Mock Deal Title ${i + 1}`,
          description: "This is a placeholder deal because the AI service is unavailable. Please configure API_KEY.",
          originalPrice: `$${(Math.random() * 100 + 50).toFixed(2)}`,
          discountedPrice: `$${(Math.random() * 50 + 20).toFixed(2)}`,
          merchant: "Mock Merchant",
          category: DEAL_CATEGORIES[i % DEAL_CATEGORIES.length],
          imageUrl: `https://picsum.photos/seed/mockdeal${i}/300/200`
        })));
      } else {
        setError(GEMINI_ERROR_MESSAGE + ` Details: ${errorMessage}`);
        setDeals([]); // Clear deals on other errors
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch of deals
    fetchDeals(userPreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDeals]); // fetchDeals is memoized with useCallback. It's stable.

  const handleSearch = (newPreferences: UserPreferences, useSearchGrounding: boolean) => {
    setUserPreferences(newPreferences);
    fetchDeals(newPreferences, useSearchGrounding);
  };

  const handleShowPriceHistory = (deal: Deal) => {
    setSelectedDealForHistory(deal);
    setPriceHistoryData(geminiService.generateMockPriceHistory(deal.discountedPrice));
  };

  const handleVerifyDeal = async (deal: Deal) => {
    setSelectedDealForVerification(deal);
    setIsVerifying(true);
    setVerificationData(null);
    if (apiKeyMissing) {
        setVerificationData({ summary: "AI Verification is unavailable. API_KEY is missing.", score: 0 });
        setIsVerifying(false);
        return;
    }
    try {
      const verification = await geminiService.verifyDeal(deal);
      setVerificationData(verification);
    } catch {
      setVerificationData({ summary: "Failed to get verification from AI.", score: 0 });
    } finally {
      setIsVerifying(false);
    }
  };

  const renderGroundingSources = () => {
    if (!groundingMetadata || !groundingMetadata.groundingChunks || groundingMetadata.groundingChunks.length === 0) {
      return null;
    }
  
    const validChunks = groundingMetadata.groundingChunks.filter(
      chunk => (chunk.web && chunk.web.uri && chunk.web.title) || 
               (chunk.retrievedContext && chunk.retrievedContext.uri && chunk.retrievedContext.title)
    );
  
    if (validChunks.length === 0) return null;
  
    const allowedSchemes = ['http:', 'https:', '/']; // Allow http, https, and relative paths starting with /

    return (
      <div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-md font-semibold text-blue-700 mb-2 flex items-center">
          <LinkIcon className="w-5 h-5 mr-2" />
          Sources (from Google Search):
        </h3>
        <ul className="list-disc list-inside space-y-1">
          {validChunks.map((chunk, index) => {
            const source = chunk.web || chunk.retrievedContext!; // Filter ensures one part is valid and has uri & title
            
            let isSafeUri = false;
            try {
              if (source.uri && source.uri.startsWith('/')) { // Relative path
                isSafeUri = true;
              } else if (source.uri) {
                const url = new URL(source.uri); // Check if it's a valid URL structure
                isSafeUri = allowedSchemes.includes(url.protocol);
              }
            } catch {
              // Invalid URL structure, so not safe by default
              isSafeUri = false;
            }
            
            if (isSafeUri) {
              return (
                <li key={index} className="text-sm">
                  <a
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    title={source.title} 
                  >
                    {source.title}
                  </a>
                </li>
              );
            } else {
              // Render as plain text if URI is not safe
              return (
                <li key={index} className="text-sm">
                  <span 
                    title={`Blocked URI: Scheme not allowed or invalid URL. Original URI: ${source.uri}`}
                    className="cursor-help"
                  >
                    {source.title} <em className="text-gray-500 text-xs">(Link restricted for security)</em>
                  </span>
                </li>
              );
            }
          })}
        </ul>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-800">
      <header className="bg-white/80 backdrop-blur-md shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="DealDigger AI Logo" className="w-10 h-10 mr-3" />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">{APP_TITLE}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
          Your intelligent assistant for discovering personalized, high-value deals from across the web. 
          Use the filters below to find exactly what you're looking for!
        </p>

        <SearchBarAndFilters onSearch={handleSearch} initialPreferences={userPreferences} isLoading={isLoading} />

        {apiKeyMissing && (
          <div className="my-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
            <p className="font-semibold">Notice:</p>
            <p>{MOCK_API_KEY_NOTICE}</p>
          </div>
        )}
        {error && !apiKeyMissing && (
          <div className="my-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {renderGroundingSources()}

        {isLoading ? (
          <LoadingSpinner />
        ) : deals.length === 0 && !error ? (
          <div className="text-center py-12">
            <TagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-400">No deals found matching your criteria. Try adjusting your search!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map(deal => (
              <DealCard 
                key={deal.id} 
                deal={deal} 
                onVerify={handleVerifyDeal}
                onShowPriceHistory={handleShowPriceHistory}
              />
            ))}
          </div>
        )}
      </main>

      <PriceHistoryModal 
        deal={selectedDealForHistory} 
        priceHistory={priceHistoryData} 
        onClose={() => setSelectedDealForHistory(null)} 
      />
      <DealVerificationModal 
        deal={selectedDealForVerification}
        verification={verificationData}
        isLoading={isVerifying}
        onClose={() => setSelectedDealForVerification(null)}
      />

      <footer className="bg-slate-800 text-gray-400 py-8 mt-12 text-center">
        <p>&copy; {new Date().getFullYear()} {APP_TITLE}. All deals generated by AI for demonstration.</p>
        <p className="text-xs mt-1">Powered by React, Tailwind CSS, and Google Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;
