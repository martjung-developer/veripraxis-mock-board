"use client";
import { 
    Sample
} from "@/module";
 
export default function Sample_Page() {

    return (
        <button onClick={() => {Sample("hellow world")}}> Click Me </button>
    );

}