 import { Link } from "react-router-dom";
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
 import { Button } from "@/components/ui/button";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { useCart } from "./CartContext";
 import { ShoppingCart, Trash2, Plus, Minus, MapPin, ArrowRight } from "lucide-react";
 
 interface CartSidebarProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 const CartSidebar = ({ open, onOpenChange }: CartSidebarProps) => {
   const { items, removeItem, updateQuantity, total, itemCount } = useCart();
 
   const formatPrice = (price: number) => {
     return new Intl.NumberFormat("en-US").format(price);
   };
 
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent side="right" className="w-[80vw] max-w-xs sm:w-80 p-0 flex flex-col">
         <SheetHeader className="p-3 border-b border-border bg-primary text-primary-foreground">
           <SheetTitle className="flex items-center gap-2 text-primary-foreground text-sm">
             <ShoppingCart className="w-4 h-4" />
             Mon Panier ({itemCount})
           </SheetTitle>
         </SheetHeader>
 
         {items.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
               <ShoppingCart className="w-6 h-6 text-muted-foreground" />
             </div>
             <h3 className="font-semibold text-foreground text-sm mb-1">Panier vide</h3>
             <p className="text-xs text-muted-foreground text-center mb-3">
               Parcourez le marketplace pour ajouter des produits
             </p>
             <Link to="/marketplace" onClick={() => onOpenChange(false)}>
               <Button variant="hero" size="sm" className="text-xs h-8">
                 Explorer le marketplace
               </Button>
             </Link>
           </div>
         ) : (
           <>
             <ScrollArea className="flex-1 p-3">
               <div className="space-y-3">
                 {items.map((item) => (
                   <div key={item.product.id} className="flex gap-2 p-2 bg-muted/50 rounded-lg">
                     <img
                       src={item.product.image}
                       alt={item.product.name}
                       className="w-14 h-14 rounded-lg object-cover"
                     />
                     <div className="flex-1 min-w-0">
                       <Link 
                         to={`/produit/${item.product.id}`}
                         onClick={() => onOpenChange(false)}
                         className="font-medium text-xs text-foreground hover:text-primary line-clamp-1"
                       >
                         {item.product.name}
                       </Link>
                       <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                         <MapPin className="w-2.5 h-2.5" />
                         {item.product.location}
                       </p>
                       <div className="flex items-center justify-between mt-1.5">
                         <span className="font-bold text-primary text-xs">
                           {formatPrice(item.product.price)} F
                         </span>
                         <div className="flex items-center gap-1">
                           <button
                             onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                             className="w-5 h-5 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                           >
                             <Minus className="w-2.5 h-2.5" />
                           </button>
                           <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                           <button
                             onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                             className="w-5 h-5 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                           >
                             <Plus className="w-2.5 h-2.5" />
                           </button>
                           <button
                             onClick={() => removeItem(item.product.id)}
                             className="w-5 h-5 rounded-full text-destructive hover:bg-destructive/10 flex items-center justify-center ml-0.5"
                           >
                             <Trash2 className="w-2.5 h-2.5" />
                           </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </ScrollArea>
 
             <div className="p-3 border-t border-border bg-card">
               <div className="flex justify-between items-center mb-3">
                 <span className="text-muted-foreground text-xs">Sous-total</span>
                 <span className="text-base font-bold text-primary">
                   {formatPrice(total)} FCFA
                 </span>
               </div>
               <Link to="/panier" onClick={() => onOpenChange(false)}>
                 <Button variant="hero" className="w-full gap-2 h-9 text-xs">
                   Commander
                   <ArrowRight className="w-3 h-3" />
                 </Button>
               </Link>
               <p className="text-[10px] text-muted-foreground text-center mt-2">
                 DHL International • Gozem National
               </p>
             </div>
           </>
         )}
       </SheetContent>
     </Sheet>
   );
 };
 
 export default CartSidebar;