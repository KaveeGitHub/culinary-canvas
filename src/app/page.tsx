
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  ChefHat,
  Sparkles,
  Loader2,
  Share2,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Volume2,
  SwitchCamera,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { detectFood, GenerateRecipeOutput, generateRecipe, suggestRecipes, RecipeSuggestion, textToSpeech, generateImage } from "@/ai";
import { cn } from "@/lib/utils";


type RecipeSuggestionWithImage = RecipeSuggestion & { imageUrl?: string; isLoadingImage?: boolean };
type ActiveRecipe = GenerateRecipeOutput & { imageUrl?: string };


const RecipeCard = ({ recipe, isLoading }: { recipe: ActiveRecipe; isLoading: boolean }) => {
  const { toast } = useToast();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleCopy = () => {
    const textToCopy = `
Recipe for ${recipe.recipeName}

Ingredients:
- ${recipe.ingredients.join('\n- ')}

Instructions:
${recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${recipe.nutritionalInformation ? `Nutritional Information:\n${recipe.nutritionalInformation}` : ''}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    toast({ title: "Copied to clipboard!" });
  };

  const handleReadAloud = async () => {
    setIsGeneratingAudio(true);
    setAudioUrl(null);
    try {
      const textForSpeech = `
        Now reading the recipe for ${recipe.recipeName}.
        Instructions: ${recipe.instructions.join(' ')}
      `.trim().replace(/\s+/g, ' ');

      const result = await textToSpeech(textForSpeech);
      setAudioUrl(result.media);
    } catch (error) {
      console.error("Text-to-speech error:", error);
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error) {
        errorMessage = typeof error === 'object' ? JSON.stringify(error) : String(error);
      }
      toast({
        variant: "destructive",
        title: "Audio Generation Failed",
        description: `The text-to-speech service failed. This can happen if the API key is invalid or has restrictions. Please check your deployment settings. Raw error: ${errorMessage}`,
        duration: 9000,
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <Card className="shadow-lg animate-in fade-in-0 duration-500 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10 rounded-lg">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="mt-4 font-semibold text-muted-foreground">Generating new recipe...</p>
        </div>
      )}
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.recipeName}
              className="w-full md:w-40 md:h-40 rounded-lg object-cover shadow-md"
            />
          ) : (
            <div className="w-full md:w-40 md:h-40 rounded-lg bg-muted flex items-center justify-center aspect-square flex-shrink-0">
              <ChefHat className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <CardTitle className="font-headline text-3xl text-primary">{recipe.recipeName}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h3 className="font-bold mb-2 text-lg font-headline">Ingredients</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
          </ul>
        </div>
        <div className="md:col-span-2">
          <h3 className="font-bold mb-2 text-lg font-headline">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2">
            {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>
      </CardContent>
      {recipe.nutritionalInformation && (
        <CardFooter className="flex-col items-start pt-0">
          <h3 className="font-bold mb-2 text-lg font-headline">Nutritional Information</h3>
          <p className="text-sm text-muted-foreground">{recipe.nutritionalInformation}</p>
        </CardFooter>
      )}
      <Separator className="my-4" />
      <CardFooter className="justify-between flex-wrap gap-4">
        <div className="flex gap-2 items-center">
            <p className="text-sm font-bold">Rate it:</p>
            <Button variant="ghost" size="icon"><ThumbsUp className="w-5 h-5"/></Button>
            <Button variant="ghost" size="icon"><ThumbsDown className="w-5 h-5"/></Button>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={handleReadAloud} disabled={isGeneratingAudio}>
            {isGeneratingAudio ? <Loader2 className="animate-spin" /> : <Volume2 />}
            Read Aloud
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            <Share2 /> Share Recipe
          </Button>
        </div>
      </CardFooter>
      {audioUrl && (
          <CardFooter>
              <audio key={audioUrl} controls autoPlay src={audioUrl} className="w-full" />
          </CardFooter>
      )}
    </Card>
  );
};


export default function CulinaryCanvasPage() {
  const [ingredients, setIngredients] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [preferredCuisines, setPreferredCuisines] = useState("");
  
  const [suggestedRecipes, setSuggestedRecipes] = useState<RecipeSuggestionWithImage[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<ActiveRecipe | null>(null);

  const [isLoading, setIsLoading] = useState<
    "detect" | "suggest" | "recipe" | false
  >(false);
  
  const webcamRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);


  const { toast } = useToast();

  useEffect(() => {
    let stream: MediaStream | null = null;

    const setupWebcam = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);

        let cameraToUse = selectedCamera;
        if (!cameraToUse || !videoInputs.find(d => d.deviceId === cameraToUse)) {
            const externalCamera = videoInputs.find(d => 
              d.label.toLowerCase().includes('usb') || 
              (!d.label.toLowerCase().includes('built-in') && 
               !d.label.toLowerCase().includes('facetime') && 
               !d.label.toLowerCase().includes('integrated'))
            );
            cameraToUse = externalCamera?.deviceId || videoInputs[0]?.deviceId;
            if (cameraToUse) {
                setSelectedCamera(cameraToUse);
            }
        }
        
        if (cameraToUse) {
            const constraints: MediaStreamConstraints = {
                video: { deviceId: { exact: cameraToUse } },
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (webcamRef.current) {
                webcamRef.current.srcObject = stream;
            }
        } else if (videoInputs.length > 0) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (webcamRef.current) {
                webcamRef.current.srcObject = stream;
            }
        } else {
             throw new Error("No video input devices found.");
        }

      } catch (err) {
        console.error("Error accessing webcam:", err);
        toast({
          variant: "destructive",
          title: "Webcam Error",
          description: "Could not access webcam. Check browser permissions or if a camera is connected.",
        });
        setIsWebcamOn(false);
      }
    };

    if (isWebcamOn) {
      setupWebcam();
    } else {
        setVideoDevices([]);
        setSelectedCamera("");
    }

    return () => {
      if (webcamRef.current && webcamRef.current.srcObject) {
        const currentStream = webcamRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach((track) => track.stop());
        webcamRef.current.srcObject = null;
      }
    };
  }, [isWebcamOn, selectedCamera, toast]);

  const handleToggleWebcam = () => setIsWebcamOn(prev => !prev);
  
  const handleSwitchCamera = () => {
    if (videoDevices.length < 2) {
      toast({ title: "No other cameras found." });
      return;
    }
    const currentIndex = videoDevices.findIndex(device => device.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    setSelectedCamera(videoDevices[nextIndex].deviceId);
  };
  
  const captureFrame = useCallback(() => {
    if (webcamRef.current && webcamRef.current.readyState === 4 && canvasRef.current) {
      const video = webcamRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg");
      }
    }
    return null;
  }, []);

  const handleDetectFood = async () => {
    if (!isWebcamOn) {
        toast({ title: "Webcam is off", description: "Turn on the webcam to detect food." });
        return;
    }
    const photoDataUri = captureFrame();
    if (!photoDataUri) {
      toast({ variant: "destructive", title: "Error", description: "Could not capture frame. Try again." });
      return;
    }
    setIsLoading("detect");
    try {
      const result = await detectFood({ photoDataUri });
      setIngredients(prev => [...new Set([...prev.split(',').map(i => i.trim()).filter(Boolean), ...result.foodItems])].join(', '));
      toast({
        title: "Food Detected!",
        description: `Added: ${result.foodItems.join(", ")}`,
      });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to detect food items." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestRecipes = async () => {
    const ingredientList = ingredients.split(',').map(i => i.trim()).filter(Boolean);
    if (ingredientList.length === 0) {
      toast({ title: "No Ingredients", description: "Please add some ingredients first." });
      return;
    }
    setIsLoading("suggest");
    setActiveRecipe(null);
    setSuggestedRecipes([]);
    try {
      const result = await suggestRecipes({
        ingredients: ingredientList,
        dietaryRestrictions,
        preferredCuisines
      });
      
      if (result.recipes.length === 0) {
        toast({ title: "No recipes found", description: "Try adding more ingredients."});
        setIsLoading(false)
        return;
      }

      setSuggestedRecipes(result.recipes.map(r => ({...r, isLoadingImage: true})));
      
      result.recipes.forEach(async (recipe, index) => {
        try {
          const imageResult = await generateImage({ recipeName: recipe.recipeName });
          setSuggestedRecipes(prev => {
              const newRecipes = [...prev];
              if(newRecipes[index]) {
                newRecipes[index].imageUrl = imageResult.imageUrl;
                newRecipes[index].isLoadingImage = false;
              }
              return newRecipes;
          });
        } catch (e) {
          console.error(`Failed to generate image for ${recipe.recipeName}`, e);
          setSuggestedRecipes(prev => {
              const newRecipes = [...prev];
              if(newRecipes[index]) {
                newRecipes[index].isLoadingImage = false;
              }
              return newRecipes;
          });
        }
      });

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to suggest recipes." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRecipe = async (recipeName: string) => {
    const ingredientList = ingredients.split(',').map(i => i.trim()).filter(Boolean);
    if (ingredientList.length === 0) {
      toast({ title: "No Ingredients", description: "Please add some ingredients to generate a recipe." });
      return;
    }
    setIsLoading("recipe");

    const suggestion = suggestedRecipes.find(r => r.recipeName === recipeName);

    // If this is the first recipe being generated, create a temporary "shell" recipe object.
    // This ensures the RecipeCard component is mounted and can display its loading state.
    // If a recipe is already active, the loading overlay will just appear over the old content.
    if (!activeRecipe) {
      setActiveRecipe({
        recipeName: recipeName,
        ingredients: [],
        instructions: [],
        imageUrl: suggestion?.imageUrl,
      });
    }

    try {
      const recipeResult = await generateRecipe({
        recipeName,
        ingredients: ingredientList,
        dietaryRestrictions,
      });
      
      setActiveRecipe({ ...recipeResult, imageUrl: suggestion?.imageUrl });

    } catch (error) {
      console.error("Error generating recipe", error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate the full recipe." });
      setActiveRecipe(null); // Clear recipe on error
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="bg-background min-h-screen text-foreground">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-headline text-primary">Culinary Canvas</h1>
          <p className="text-muted-foreground mt-2 text-lg">Your AI-powered sous-chef</p>
        </header>
        
        <Card className="mb-8 shadow-lg border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-3 text-2xl"><Camera /> Webcam Feed</CardTitle>
            <CardDescription>Toggle your camera and detect ingredients in a snap.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-full max-w-2xl bg-black rounded-lg overflow-hidden aspect-video relative border-2 border-muted">
                <video ref={webcamRef} autoPlay playsInline className={cn("w-full h-full object-cover transition-opacity", { 'opacity-100': isWebcamOn, 'opacity-0': !isWebcamOn })}/>
                {!isWebcamOn && (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
                        <Camera size={48} className="mb-4" />
                        <p>Webcam is off</p>
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={handleToggleWebcam} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Camera />
                {isWebcamOn ? 'Turn Off Webcam' : 'Turn On Webcam'}
              </Button>
              <Button onClick={handleDetectFood} disabled={isLoading !== false || !isWebcamOn} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Sparkles />
                Detect Ingredients
              </Button>
              {isWebcamOn && videoDevices.length > 1 && (
                <Button onClick={handleSwitchCamera} variant="outline">
                  <SwitchCamera />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-3 text-2xl"><ChefHat /> Create a Recipe</CardTitle>
            <CardDescription>Tell us what you have on hand and your culinary preferences.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="ingredients" className="text-base">Ingredients</Label>
                <Textarea id="ingredients" rows={4} placeholder="e.g., chicken breast, tomatoes, garlic" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
                <p className="text-sm text-muted-foreground">Separate items with a comma.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diet" className="text-base">Dietary Restrictions</Label>
                  <Input id="diet" placeholder="e.g., vegetarian, gluten-free" value={dietaryRestrictions} onChange={e => setDietaryRestrictions(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisine" className="text-base">Preferred Cuisines</Label>
                  <Input id="cuisine" placeholder="e.g., Italian, Mexican" value={preferredCuisines} onChange={e => setPreferredCuisines(e.target.value)} />
                </div>
              </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-center gap-4 pt-6">
            <Button onClick={handleSuggestRecipes} disabled={isLoading !== false} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading === "suggest" ? <Loader2 className="animate-spin" /> : <ChefHat />}
              Suggest Recipes
            </Button>
          </CardFooter>
        </Card>
        
        <section className="space-y-8 mt-12">
          {isLoading === 'suggest' && (
            <div className="flex justify-center items-center flex-col py-16 text-muted-foreground">
                <Loader2 size={48} className="animate-spin text-primary mb-4" />
                <p>Coming up with some delicious recipe ideas...</p>
            </div>
          )}

          {suggestedRecipes.length > 0 && !activeRecipe && !isLoading && (
            <Card className="shadow-lg animate-in fade-in-0 duration-500">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary">Recipe Ideas</CardTitle>
                <CardDescription>Here are a few ideas based on your ingredients. Choose one to get the full recipe.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {suggestedRecipes.map((recipe, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group"
                    onClick={() => handleGenerateRecipe(recipe.recipeName)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {recipe.isLoadingImage ? (
                          <Loader2 className="animate-spin text-muted-foreground" />
                        ) : recipe.imageUrl ? (
                          <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
                        ) : (
                          <ChefHat className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold font-headline text-lg group-hover:text-primary">{recipe.recipeName}</h3>
                        <p className="text-sm text-muted-foreground">{recipe.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-4 transition-transform group-hover:translate-x-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeRecipe && (
             <RecipeCard recipe={activeRecipe} isLoading={isLoading === 'recipe'} />
          )}
          
          {suggestedRecipes.length > 0 && activeRecipe && !isLoading && (
            <Card className="shadow-lg animate-in fade-in-0 duration-500">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary">Or Try Another Recipe</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {suggestedRecipes.filter(r => r.recipeName !== activeRecipe.recipeName).map((recipe, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group"
                    onClick={() => handleGenerateRecipe(recipe.recipeName)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {recipe.isLoadingImage ? (
                          <Loader2 className="animate-spin text-muted-foreground" />
                        ) : recipe.imageUrl ? (
                          <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
                        ) : (
                          <ChefHat className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold font-headline text-lg group-hover:text-primary">{recipe.recipeName}</h3>
                        <p className="text-sm text-muted-foreground">{recipe.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-4 transition-transform group-hover:translate-x-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}


          {!isLoading && suggestedRecipes.length === 0 && !activeRecipe && (
            <div className="text-center py-16 text-muted-foreground rounded-lg border-2 border-dashed">
              <ChefHat size={64} className="mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-headline">Ready to cook?</h2>
              <p>Detect ingredients or enter them manually to get recipe ideas.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
