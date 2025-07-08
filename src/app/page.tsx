
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
  SwitchCamera,
  Bot,
  User,
  Mic,
  Volume2,
  Pause,
  Play,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { detectFood, GenerateRecipeOutput, generateRecipe, suggestRecipes, RecipeSuggestion, askChef } from "@/ai";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


type ActiveRecipe = GenerateRecipeOutput & { imageUrl?: string; imageHint?: string };
type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};


const FormattedMessage = ({ content }: { content: string }) => {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <p className="text-sm whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </p>
  );
};

const ChefChatDialog = ({ recipe, isOpen, onOpenChange }: { recipe: ActiveRecipe; isOpen: boolean; onOpenChange: (open: boolean) => void }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isChefLoading, setIsChefLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsSpeechSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  const handleMicClick = () => {
    if (!isSpeechSupported) {
        toast({
            variant: "destructive",
            title: "Voice Not Supported",
            description: "Your browser does not support speech recognition.",
        });
        return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      return; 
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.start();

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${speechResult}` : speechResult);
    };

    recognition.onerror = (event: any) => {
      toast({
        variant: "destructive",
        title: "Voice Input Error",
        description: `Could not recognize speech. Error: ${event.error}`,
      });
      setIsRecording(false);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChefLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsChefLoading(true);

    try {
      const result = await askChef({
        recipe: recipe,
        question: input,
        history: messages,
      });

      const chefMessage: ChatMessage = { role: 'model', content: result.answer };
      setMessages(prev => [...prev, chefMessage]);

    } catch (error) {
       // Fail silently
    } finally {
      setIsChefLoading(false);
    }
  };

  // Reset chat when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setMessages([]);
      setInput("");
      setIsChefLoading(false);
      setIsRecording(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Bot /> Ask the Chef
          </DialogTitle>
          <DialogDescription>
            Have a question about the "{recipe.recipeName}" recipe? Ask away!
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="pr-4 -mr-4 flex-1 min-h-0">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'model' && (
                  <Avatar className="w-8 h-8 bg-primary text-primary-foreground flex-shrink-0">
                    <AvatarFallback><Bot size={20} /></AvatarFallback>
                  </Avatar>
                )}
                 <div
                  className={cn(
                    "p-3 rounded-lg max-w-[80%]",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {message.role === 'model' ? (
                    <FormattedMessage content={message.content} />
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 bg-muted text-muted-foreground flex-shrink-0">
                    <AvatarFallback><User size={20} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isChefLoading && (
                <div className="flex items-start gap-3 justify-start">
                    <Avatar className="w-8 h-8 bg-primary text-primary-foreground flex-shrink-0">
                        <AvatarFallback><Bot size={20} /></AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg bg-muted text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                </div>
            )}
             <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-auto pt-4">
          <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Listening..." : "e.g., Can I substitute chicken?"}
              disabled={isChefLoading}
              className="flex-1"
            />
            {isSpeechSupported && (
              <Button 
                type="button" 
                variant={isRecording ? "destructive" : "outline"} 
                size="icon" 
                onClick={handleMicClick} 
                disabled={isChefLoading}
              >
                <Mic className={cn(isRecording && "animate-pulse")} />
              </Button>
            )}
            <Button type="submit" disabled={isChefLoading || !input.trim()}>
              {isChefLoading ? <Loader2 className="animate-spin" /> : 'Send'}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RecipeCard = ({ recipe, isLoading }: { recipe: ActiveRecipe; isLoading: boolean }) => {
    const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle');
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // This effect ensures that when a new recipe is loaded, any ongoing speech from the previous recipe is stopped.
    useEffect(() => {
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, [recipe]);

    const handleReadAloud = () => {
        if (!window.speechSynthesis || speechState !== 'idle') {
            return;
        }

        const textToSpeak = [
            `Recipe for ${recipe.recipeName}.`,
            'The ingredients are:', ...recipe.ingredients,
            'The instructions are:', ...recipe.instructions.map((step, i) => `Step ${i + 1}: ${step}`)
        ].join('. ');

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utteranceRef.current = utterance;
        
        utterance.volume = 1; // Set volume to maximum

        utterance.onstart = () => setSpeechState('speaking');
        utterance.onpause = () => setSpeechState('paused');
        utterance.onresume = () => setSpeechState('speaking');
        utterance.onend = () => setSpeechState('idle');
        utterance.onerror = (e) => {
            setSpeechState('idle');
        };

        window.speechSynthesis.speak(utterance);
    };

    const handlePause = () => {
        if (window.speechSynthesis && speechState === 'speaking') {
            window.speechSynthesis.pause();
        }
    };

    const handleResume = () => {
        if (window.speechSynthesis && speechState === 'paused') {
            window.speechSynthesis.resume();
        }
    };

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
    };

  const [isChefChatOpen, setIsChefChatOpen] = useState(false);
  
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
              data-ai-hint={recipe.imageHint}
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
      <CardFooter className="flex-col items-stretch gap-y-4">
        <div className="w-full flex justify-between items-center flex-wrap gap-4 pt-2">
          <div className="flex gap-2 items-center">
            <p className="text-sm font-bold">Rate it:</p>
            <Button variant="ghost" size="icon"><ThumbsUp className="w-5 h-5"/></Button>
            <Button variant="ghost" size="icon"><ThumbsDown className="w-5 h-5"/></Button>
          </div>
           <div className="flex gap-2 items-center flex-wrap justify-end">
                 {speechState === 'idle' && (
                    <Button variant="outline" onClick={handleReadAloud}>
                        <Volume2 /> Read Aloud
                    </Button>
                )}
                {speechState === 'speaking' && (
                     <Button variant="outline" onClick={handlePause}>
                        <Pause /> Pause
                    </Button>
                )}
                {speechState === 'paused' && (
                    <Button variant="outline" onClick={handleResume}>
                        <Play /> Resume
                    </Button>
                )}
            <Button variant="outline" onClick={() => setIsChefChatOpen(true)}>
              <Sparkles />
              Ask Chef
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              <Share2 /> Share Recipe
            </Button>
          </div>
        </div>
      </CardFooter>
       <ChefChatDialog recipe={recipe} isOpen={isChefChatOpen} onOpenChange={setIsChefChatOpen} />
    </Card>
  );
};


export default function CulinaryCanvasPage() {
  const [ingredients, setIngredients] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [preferredCuisines, setPreferredCuisines] = useState("");
  
  const [suggestedRecipes, setSuggestedRecipes] = useState<RecipeSuggestion[]>([]);
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
    const setupWebcam = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);

        let stream: MediaStream | null = null;
        let constraints: MediaStreamConstraints;

        if (selectedCamera) {
          constraints = { video: { deviceId: { exact: selectedCamera } } };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          const isMobile = /Mobi|Android/i.test(navigator.userAgent);
          if (isMobile) {
            // On mobile, first try for the back camera.
            try {
              constraints = { video: { facingMode: 'environment' } };
              stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
              // If back camera fails, fall back to any camera.
              constraints = { video: true };
              stream = await navigator.mediaDevices.getUserMedia(constraints);
            }
          } else {
            // On desktop, just get the default camera (usually front).
            constraints = { video: true };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          }
        }
        
        if (webcamRef.current) {
            webcamRef.current.srcObject = stream;
        }

        if (!selectedCamera && stream) {
            const currentTrack = stream.getVideoTracks()[0];
            if (currentTrack) {
                const settings = currentTrack.getSettings();
                if (settings.deviceId) {
                    setSelectedCamera(settings.deviceId);
                }
            }
        }

      } catch (err) {
        setIsWebcamOn(false);
      }
    };

    if (isWebcamOn) {
      setupWebcam();
    } else {
      if (webcamRef.current && webcamRef.current.srcObject) {
        const currentStream = webcamRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach((track) => track.stop());
        webcamRef.current.srcObject = null;
      }
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
  }, [isWebcamOn, selectedCamera]);

  const handleToggleWebcam = () => setIsWebcamOn(prev => !prev);
  
  const handleSwitchCamera = () => {
    if (videoDevices.length < 2) {
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
        return;
    }
    const photoDataUri = captureFrame();
    if (!photoDataUri) {
      return;
    }
    setIsLoading("detect");
    try {
      const result = await detectFood({ photoDataUri });
      setIngredients(prev => [...new Set([...prev.split(',').map(i => i.trim()).filter(Boolean), ...result.foodItems])].join(', '));
    } catch (error) {
        // Fail silently
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestRecipes = async () => {
    const ingredientList = ingredients.split(',').map(i => i.trim()).filter(Boolean);
    if (ingredientList.length === 0) {
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
        setIsLoading(false)
        return;
      }

      setSuggestedRecipes(result.recipes);

    } catch (error) {
        // Fail silently
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRecipe = async (recipeName: string) => {
    const ingredientList = ingredients.split(',').map(i => i.trim()).filter(Boolean);
    if (ingredientList.length === 0) {
        return;
    }

    const selectedSuggestion = suggestedRecipes.find(r => r.recipeName === recipeName);

    setIsLoading("recipe");
    setActiveRecipe({
        recipeName: recipeName,
        ingredients: [],
        instructions: [],
        imageUrl: selectedSuggestion?.imageUrl,
        imageHint: recipeName.split(' ').slice(0, 2).join(' '),
    });

    try {
        const recipeResult = await generateRecipe({
            recipeName,
            ingredients: ingredientList,
            dietaryRestrictions,
        });
        
        const finalRecipe: ActiveRecipe = {
            ...recipeResult,
            imageUrl: selectedSuggestion?.imageUrl,
            imageHint: recipeName.split(' ').slice(0, 2).join(' '),
        };
        
        setActiveRecipe(finalRecipe);

    } catch (error) {
        setActiveRecipe(null);
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
                <Button onClick={handleSwitchCamera} variant="outline" size="icon">
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
                  <button 
                    key={index} 
                    disabled={isLoading !== false}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
                    onClick={() => handleGenerateRecipe(recipe.recipeName)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.recipeName}
                          className="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ChefHat className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold font-headline text-lg group-hover:text-primary">{recipe.recipeName}</h3>
                        <p className="text-sm text-muted-foreground">{recipe.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-4 transition-transform group-hover:translate-x-1" />
                  </button>
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
                  <button 
                    key={index} 
                    disabled={isLoading !== false}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
                    onClick={() => handleGenerateRecipe(recipe.recipeName)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                       {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.recipeName}
                          className="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ChefHat className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold font-headline text-lg group-hover:text-primary">{recipe.recipeName}</h3>
                        <p className="text-sm text-muted-foreground">{recipe.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-4 transition-transform group-hover:translate-x-1" />
                  </button>
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
