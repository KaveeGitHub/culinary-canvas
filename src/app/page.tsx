
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
  Bot,
  User,
  Mic,
  PlayCircle,
  PauseCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { detectFood, GenerateRecipeOutput, generateRecipe, suggestRecipes, RecipeSuggestion, generateImage, askChef } from "@/ai";
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isChefLoading, setIsChefLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsSpeechSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  const handleMicClick = () => {
    if (!isSpeechSupported) {
        toast({
            variant: "destructive",
            title: "Unsupported Browser",
            description: "Speech recognition is not supported by your browser.",
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
      let errorMessage = "An unknown error occurred.";
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMessage = "Microphone access denied. Please enable it in browser settings.";
      } else if (event.error === 'no-speech') {
        errorMessage = "No speech was detected. Please try again.";
      }
      toast({
        variant: "destructive",
        title: "Speech Error",
        description: errorMessage,
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
      console.error("Ask Chef error:", error);
      const errorMessage: ChatMessage = { role: 'model', content: "Sorry, I'm having trouble responding right now. Please try again in a moment." };
      setMessages(prev => [...prev, errorMessage]);
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
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] h-[90vh] grid grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Bot /> Ask the Chef
          </DialogTitle>
          <DialogDescription>
            Have a question about the "{recipe.recipeName}" recipe? Ask away!
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="pr-4 -mr-4 min-h-0">
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
        
        <DialogFooter>
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
  const { toast } = useToast();
  const [isChefChatOpen, setIsChefChatOpen] = useState(false);

  const [speechStatus, setSpeechStatus] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const [isTtsSupported, setIsTtsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsTtsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    // Cleanup speech synthesis on component unmount
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

  const handleReadAloud = () => {
    if (!isTtsSupported) {
      toast({
        variant: "destructive",
        title: "Unsupported Browser",
        description: "Your browser does not support text-to-speech.",
      });
      return;
    }
  
    const synth = window.speechSynthesis;
  
    if (speechStatus === 'speaking') {
      synth.pause();
      setSpeechStatus('paused');
    } else if (speechStatus === 'paused') {
      synth.resume();
      setSpeechStatus('speaking');
    } else { // status is 'idle'
      synth.cancel(); // Clear any previous utterances
  
      const textForSpeech = `
        Recipe for ${recipe.recipeName}.
        Instructions: ${recipe.instructions.join('. ')}
      `.trim().replace(/\s+/g, ' ');
  
      const newUtterance = new SpeechSynthesisUtterance(textForSpeech);
      utteranceRef.current = newUtterance;
  
      newUtterance.onstart = () => {
        setSpeechStatus('speaking');
      };
  
      newUtterance.onend = () => {
        setSpeechStatus('idle');
        utteranceRef.current = null;
      };
  
      newUtterance.onerror = () => {
        setSpeechStatus('idle');
        utteranceRef.current = null;
        toast({
          variant: "destructive",
          title: "Speech Error",
          description: "An error occurred while trying to read the text.",
        });
      };
  
      synth.speak(newUtterance);
    }
  };

  const getButtonProps = () => {
    switch (speechStatus) {
      case 'speaking':
        return { Icon: PauseCircle, text: 'Pause' };
      case 'paused':
        return { Icon: PlayCircle, text: 'Resume' };
      default: // 'idle'
        return { Icon: Volume2, text: 'Read Aloud' };
    }
  };
  
  const { Icon: SpeechIcon, text: speechText } = getButtonProps();


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
      <CardFooter className="justify-between flex-wrap gap-4">
        <div className="flex gap-2 items-center">
            <p className="text-sm font-bold">Rate it:</p>
            <Button variant="ghost" size="icon"><ThumbsUp className="w-5 h-5"/></Button>
            <Button variant="ghost" size="icon"><ThumbsDown className="w-5 h-5"/></Button>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={handleReadAloud} disabled={!isTtsSupported}>
            <SpeechIcon />
            {speechText}
          </Button>
          <Button variant="outline" onClick={() => setIsChefChatOpen(true)}>
            <Sparkles />
            Ask Chef
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            <Share2 /> Share Recipe
          </Button>
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
    let stream: MediaStream | null = null;

    const setupWebcam = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);

        let cameraToUse = selectedCamera;
        if (!cameraToUse || !videoInputs.find(d => d.deviceId === cameraToUse)) {
            const integratedCamera = videoInputs.find(d => 
              d.label.toLowerCase().includes('facetime') || 
              d.label.toLowerCase().includes('built-in') || 
              d.label.toLowerCase().includes('integrated')
            );
            cameraToUse = integratedCamera?.deviceId || videoInputs[0]?.deviceId;
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

      setSuggestedRecipes(result.recipes);

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
    setActiveRecipe({
        recipeName: recipeName,
        ingredients: [],
        instructions: [],
    });

    let recipeResult: GenerateRecipeOutput | null = null;
    let imageResult: { imageUrl?: string } | null = null;

    try {
        // Run both promises, but don't fail the entire function if one rejects
        const [recipeSettled, imageSettled] = await Promise.allSettled([
            generateRecipe({
                recipeName,
                ingredients: ingredientList,
                dietaryRestrictions,
            }),
            generateImage({ recipeName }),
        ]);
        
        if (recipeSettled.status === 'fulfilled') {
            recipeResult = recipeSettled.value;
        } else {
             // If recipe fails, it's a critical error
             console.error("Recipe generation failed:", recipeSettled.reason);
             toast({
                variant: "destructive",
                title: "Recipe Generation Failed",
                description: "Could not generate the recipe. Please try again.",
            });
            setActiveRecipe(null);
            setIsLoading(false);
            return;
        }

        if (imageSettled.status === 'fulfilled') {
            imageResult = imageSettled.value;
        } else {
            console.error("Image generation failed:", imageSettled.reason);
            const reasonStr = (imageSettled.reason || '').toString();
            if (reasonStr.includes('429') || reasonStr.includes('quota')) {
              // Silently fail on quota error, don't show toast
            } else {
              // Fail silently for other image errors too
            }
        }
        
        const finalRecipe: ActiveRecipe = {
            ...recipeResult,
            imageUrl: imageResult?.imageUrl,
            imageHint: recipeName.split(' ').slice(0, 2).join(' '),
        };
        
        setActiveRecipe(finalRecipe);

    } catch (error) {
        console.error("An unexpected error occurred in handleGenerateRecipe", error);
        toast({
            variant: "destructive",
            title: "An Unexpected Error Occurred",
            description: "Please try again.",
        });
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
                      <ChefHat className="w-8 h-8 text-muted-foreground flex-shrink-0" />
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
                      <ChefHat className="w-8 h-8 text-muted-foreground flex-shrink-0" />
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
