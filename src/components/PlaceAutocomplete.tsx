import { useContext, useId, useState } from "react";
import { placesData } from "../data/places";
import { Icon, TaxiLauncherContext } from "./index";
import { translate } from "../lib/i18n";

export function PlaceAutocomplete({
  label,
  value,
  onChange,
  includeCurrent = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  includeCurrent?: boolean;
}) {
  const language = useContext(TaxiLauncherContext).language;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputId = useId();
  const listId = `${inputId}-options`;
  const results = placesData.filter(
    (place) =>
      (includeCurrent || place.name !== "Mi ubicación actual") &&
      `${place.name} ${place.address}`
        .toLocaleLowerCase("es")
        .includes(value.toLocaleLowerCase("es")),
  );
  const choose = (place: string) => {
    onChange(place);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="field autocomplete">
      <label htmlFor={inputId}>{translate(label, language)}</label>
      <div className="search-box">
        <Icon name="pin" />
        <input
          id={inputId}
          value={value}
          onFocus={() => {
            setOpen(true);
            setActiveIndex(-1);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              setActiveIndex(-1);
            }, 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.preventDefault();
              setOpen(false);
              setActiveIndex(-1);
              return;
            }
            if (event.key === "ArrowDown" && results.length) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => (index + 1) % results.length);
            } else if (event.key === "ArrowUp" && results.length) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
            } else if (event.key === "Enter" && open && activeIndex >= 0) {
              event.preventDefault();
              choose(results[activeIndex].name);
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          placeholder={translate("Busca un lugar de Ocaña", language)}
        />
      </div>
      {open && (
        <div className="autocomplete-list" id={listId} role="listbox" aria-label={`${translate(label, language)}: ${translate("sugerencias", language)}`}>
          {results.length === 0 && <span className="autocomplete-empty">{translate("No hay lugares que coincidan.", language)}</span>}
          {results.map((place, index) => (
            <div
              id={`${listId}-${index}`}
              className={activeIndex === index ? "autocomplete-option active" : "autocomplete-option"}
              role="option"
              aria-selected={activeIndex === index}
              key={place.name}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(place.name)}
            >
              <b>{place.name}</b>
              <small>{place.address}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
