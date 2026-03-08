import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDemand } from "@/hooks/useDemands";
import { useToast } from "@/hooks/use-toast";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";
import { HandCoins, Loader2 } from "lucide-react";

interface CreateDemandModalProps {
  trigger?: React.ReactNode;
}

const CreateDemandModal = ({ trigger }: CreateDemandModalProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const { mutate: createDemand, isPending } = useCreateDemand();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!title || !category) {
      toast({ title: "Erreur", description: "Titre et catégorie requis", variant: "destructive" });
      return;
    }

    createDemand(
      {
        title,
        description,
        category,
        quantity: quantity ? Number(quantity) : undefined,
        unit,
        budget: budget ? Number(budget) : undefined,
        location,
      },
      {
        onSuccess: () => {
          toast({ title: "Demande publiée !", description: "Les fournisseurs de cette catégorie seront notifiés." });
          setOpen(false);
          setTitle(""); setDescription(""); setCategory(""); setQuantity(""); setBudget(""); setLocation("");
        },
        onError: (err: any) => {
          toast({ title: "Erreur", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <HandCoins className="w-3.5 h-3.5" />Exprimer un besoin
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <HandCoins className="w-4 h-4 text-primary" />
            Exprimer un besoin d'achat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Titre *</Label>
            <Input placeholder="Ex: Recherche maïs jaune en gros" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Décrivez votre besoin en détail..." value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs mt-1 min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">Catégorie *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {marketplaceCategories.filter(c => c.id !== "all").map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Quantité</Label>
              <Input type="number" placeholder="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Unité</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["kg", "tonne", "unité", "litre", "sac"].map(u => (
                    <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Budget (FCFA)</Label>
              <Input type="number" placeholder="50000" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Localisation</Label>
              <Input placeholder="Lomé" value={location} onChange={(e) => setLocation(e.target.value)} className="h-9 text-xs mt-1" />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full h-9 text-xs gap-1.5">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HandCoins className="w-3.5 h-3.5" />}
            Publier ma demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDemandModal;
