import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { entryFilterOptions, type EntrySearchArticle } from "@/lib/entryArticleSearch";
const NONE = "__none__";
interface Props {
 reference: string; setReference: (v: string) => void; designation: string; setDesignation: (v: string) => void;
 category: string; setCategory: (v: string) => void; subcategory: string; setSubcategory: (v: string) => void;
 brand: string; setBrand: (v: string) => void; showBrand: boolean;
 articles: EntrySearchArticle[]; categories: { id: string; nom: string; parent_id: string | null }[];
}
export function QuickArticleFields({ reference, setReference, designation, setDesignation, category, setCategory, subcategory, setSubcategory, brand, setBrand, showBrand, articles, categories }: Props) {
 return (
                <div className="space-y-3">
                  <div className="space-y-1"><Label htmlFor="quick-entry-reference">Référence *</Label><Input id="quick-entry-reference" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="quick-entry-name">Nom de l'article *</Label><Input id="quick-entry-name" value={designation} onChange={(e) => setDesignation(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Catégorie *</Label>
                      <Select value={category} onValueChange={(value) => { setCategory(value); setSubcategory(""); }}><SelectTrigger aria-label="Catégorie"><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{categories.filter((c) => !c.parent_id).map((c) => <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Sous-catégorie</Label>
                      <Select value={subcategory || NONE} onValueChange={(value) => setSubcategory(value === NONE ? "" : value)}><SelectTrigger aria-label="Sous-catégorie"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value={NONE}>Aucune</SelectItem>{categories.filter((c) => c.parent_id === categories.find((root) => !root.parent_id && root.nom === category)?.id).map((c) => <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {showBrand && <div className="space-y-1"><Label htmlFor="quick-entry-brand">Marque</Label><AutocompleteInput id="quick-entry-brand" value={brand} onValueChange={setBrand} suggestions={entryFilterOptions(articles, category, subcategory).brands} placeholder="Marque de l’article" /></div>}
                </div>
 );
}
